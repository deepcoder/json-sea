// api.js
const ECM_API_URL = 'https://ecm.earthdiver.com';

// Cache configuration
const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

const collectionsCache = {};
const documentsCache = {};
const documentCache = {};

export const AVAILABLE_DATABASES = [
    {id: 'ecm', name: 'ECM DB'},
    {id: 'gatsby', name: 'Gatsby DB'},
    {id: 'pydiver_partners_prep', name: 'EPS Prep'},
    {id: 'pydiver_partners_prod', name: 'EPS Prod'},
    {id: 'harvester_links', name: 'EPS Migration'},
];

const isCacheValid = (cache, key) => {
    return (
        cache[key] &&
        Date.now() - cache[key].timestamp < CACHE_EXPIRY_TIME
    );
};

export const clearAllCaches = () => {
    Object.keys(collectionsCache).forEach(key => delete collectionsCache[key]);
    Object.keys(documentsCache).forEach(key => delete documentsCache[key]);
    Object.keys(documentCache).forEach(key => delete documentCache[key]);
    console.log('All API caches cleared');
};

export const clearDatabaseCache = (database) => {
    if (database) {
        delete collectionsCache[database];

        // Clear documents and document caches for this database
        Object.keys(documentsCache).forEach(key => {
            if (key.startsWith(`${database}:`)) {
                delete documentsCache[key];
            }
        });

        Object.keys(documentCache).forEach(key => {
            if (key.startsWith(`${database}:`)) {
                delete documentCache[key];
            }
        });

        console.log(`Cache cleared for database: ${database}`);
    }
};

export const apiFetchCollections = async (database = 'ecm', forceRefresh = false) => {
    // Check cache first unless force refresh is requested
    if (!forceRefresh && isCacheValid(collectionsCache, database)) {
        console.log(`Using cached collections for database: ${database}`);
        return collectionsCache[database].data;
    }

    try {
        const response = await fetch(`${ECM_API_URL}/api/browser/${database}/collections`);
        if (!response.ok) throw new Error(`Failed to fetch collections: ${response.statusText}`);

        const data = await response.json();
        const collections = data.collections || [];
        const sortedCollections = collections.sort((a, b) => a.localeCompare(b));

        // Update cache
        collectionsCache[database] = {
            data: sortedCollections,
            timestamp: Date.now()
        };

        return sortedCollections;
    } catch (error) {
        console.error(`Error fetching collections for ${database}:`, error);
        throw error;
    }
};

export const apiFetchDocuments = async (collectionName, page = 0, rowsPerPage = 10, database = 'ecm', forceRefresh = false) => {
    if (!collectionName) throw new Error('Collection name is required');

    const cacheKey = `${database}:${collectionName}:${page}:${rowsPerPage}`;

    // Check cache first unless force refresh is requested
    if (!forceRefresh && isCacheValid(documentsCache, cacheKey)) {
        console.log(`Using cached documents for key: ${cacheKey}`);
        return documentsCache[cacheKey].data;
    }

    try {
        const response = await fetch(
            `${ECM_API_URL}/api/browser/${database}/${collectionName}/documents?skip=${page * rowsPerPage}&limit=${rowsPerPage}`
        );

        if (!response.ok) throw new Error('Failed to fetch documents');

        const data = await response.json();
        const result = {
            documents: data.documents || [],
            total: data.total || 0
        };

        // Update cache
        documentsCache[cacheKey] = {
            data: result,
            timestamp: Date.now()
        };

        return result;
    } catch (error) {
        console.error(`Error fetching documents for ${cacheKey}:`, error);
        throw error;
    }
};

export const apiFetchDocument = async (collectionName, documentId, database = 'ecm', forceRefresh = false) => {
    if (!collectionName || !documentId) throw new Error('Collection name and document ID are required');

    const cacheKey = `${database}:${collectionName}:${documentId}`;

    // Check cache first unless force refresh is requested
    if (!forceRefresh && isCacheValid(documentCache, cacheKey)) {
        console.log(`Using cached document for key: ${cacheKey}`);
        return documentCache[cacheKey].data;
    }

    try {
        const response = await fetch(
            `${ECM_API_URL}/api/browser/${database}/${collectionName}/document/${documentId}`
        );

        if (!response.ok) throw new Error('Failed to fetch document');

        const data = await response.json();

        // Update cache
        documentCache[cacheKey] = {
            data: data,
            timestamp: Date.now()
        };

        return data;
    } catch (error) {
        console.error(`Error fetching document for ${cacheKey}:`, error);
        throw error;
    }
};

// Function to fetch a PyDiver document directly by ID
export const apiFetchPyDiverDocument = async (pyDiverId, forceRefresh = false) => {
    if (!pyDiverId) throw new Error('PyDiver ID is required');

    const cacheKey = `pydiver:${pyDiverId}`;

    // Check cache first unless force refresh is requested
    if (!forceRefresh && isCacheValid(documentCache, cacheKey)) {
        console.log(`Using cached PyDiver document for key: ${cacheKey}`);
        return documentCache[cacheKey].data;
    }

    try {
        const response = await fetch(`${ECM_API_URL}/api/pydiver/${pyDiverId}`);

        if (!response.ok) throw new Error(`Failed to fetch PyDiver document: ${response.statusText}`);

        const data = await response.json();

        // Update cache
        documentCache[cacheKey] = {
            data: data,
            timestamp: Date.now()
        };

        return data;
    } catch (error) {
        console.error(`Error fetching PyDiver document ${pyDiverId}:`, error);
        throw error;
    }
};