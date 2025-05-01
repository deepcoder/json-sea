'use client';

import {Button} from '@nextui-org/button';
import {Input} from '@nextui-org/input';
import {Modal, ModalBody, ModalContent, ModalHeader} from '@nextui-org/modal';
import {Select, SelectItem} from '@nextui-org/select';
import {Selection} from '@react-types/shared';
import {ComponentProps, memo, useCallback, useEffect, useState} from 'react';
import {useJsonDiagramViewStore} from '../../store/json-diagram-view/json-diagram-view.store';
import {useJsonEngineStore} from '../../store/json-engine/json-engine.store';
import {Text} from '../../ui/components/Text';
import {formatJsonLikeData, isArray, isNull, isObject, isValidJson} from '../../utils/json.util';
import {useString} from '../../utils/react-hooks/useString';
import {apiFetchCollections, apiFetchDocuments, apiFetchPyDiverDocument, AVAILABLE_DATABASES} from '../../api/ecm/api';

type Props = {
    isModalOpen: boolean;
    closeModal: () => void;
};

const _PyDiverImportModal = ({isModalOpen, closeModal}: Props) => {
    // State for database selection
    const [selectedDatabase, setSelectedDatabase] = useState<string>('ecm');
    const [collections, setCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string>('');

    // Loading states
    const [isLoadingCollections, setIsLoadingCollections] = useState<boolean>(false);
    const [isLoadingCollection, setIsLoadingCollection] = useState<boolean>(false);
    const [isPyDiverLoading, setIsPyDiverLoading] = useState<boolean>(false);

    // Error state
    const [error, setError] = useState<string | null>(null);

    // PyDiver document ID state
    const {
        string: pyDiverIdValue,
        isEmpty: isPyDiverIdEmpty,
        setString: setPyDiverIdValue,
        clearString: clearPyDiverIdValue,
    } = useString();

    const setStringifiedJson = useJsonEngineStore((state) => state.setStringifiedJson);
    const resetSelectedNode = useJsonDiagramViewStore((state) => state.resetSelectedNode);

    // Fetch collections when database changes
    useEffect(() => {
        const fetchCollections = async () => {
            if (!selectedDatabase) return;

            setIsLoadingCollections(true);
            setError(null);

            try {
                const fetchedCollections = await apiFetchCollections(selectedDatabase);
                setCollections(fetchedCollections);
            } catch (err) {
                console.error('Failed to fetch collections:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch collections');
                setCollections([]);
            } finally {
                setIsLoadingCollections(false);
            }
        };

        fetchCollections();
        // Reset collection selection when database changes
        setSelectedCollection('');
    }, [selectedDatabase]);

    // Handle database change
    const handleDatabaseChange = useCallback((keys: Selection) => {
        const selectedKey = Array.from(keys)[0]?.toString();
        if (selectedKey) {
            setSelectedDatabase(selectedKey);
            setError(null);
        }
    }, []);

    // Handle collection change
    const handleCollectionChange = useCallback((keys: Selection) => {
        const selectedKey = Array.from(keys)[0]?.toString();
        if (selectedKey) {
            setSelectedCollection(selectedKey);
            setError(null);
        }
    }, []);

    // Handle PyDiver ID input changes
    const handlePyDiverIdChange: ComponentProps<typeof Input>['onChange'] = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setPyDiverIdValue(e.target.value);
            setError(null);
        },
        [setPyDiverIdValue],
    );

    const handlePyDiverIdClear: ComponentProps<typeof Input>['onClear'] = useCallback(() => {
        clearPyDiverIdValue();
        setError(null);
    }, [clearPyDiverIdValue]);

    const handlePyDiverIdKeyDown: ComponentProps<typeof Input>['onKeyDown'] = (e) => {
        if (e.key === 'Enter' && !isPyDiverIdEmpty) {
            fetchPyDiverDocument();
        }
    };

    // Reset form on modal close
    useEffect(() => {
        if (!isModalOpen) {
            clearPyDiverIdValue();
            setError(null);
        }
    }, [isModalOpen, clearPyDiverIdValue]);

    // Function to fetch PyDiver document by ID
    const fetchPyDiverDocument = async () => {
        if (isPyDiverIdEmpty) return;

        setIsPyDiverLoading(true);
        setError(null);

        try {
            // Use the cached API function
            const data = await apiFetchPyDiverDocument(pyDiverIdValue);

            if (isObject(data) || isArray(data)) {
                const formattedData: string = formatJsonLikeData(data);

                if (isValidJson(formattedData)) {
                    // Pass the MongoDB option when setting the JSON
                    setStringifiedJson(formattedData, {isMongoData: true});
                    resetSelectedNode();
                    closeModal();
                } else {
                    throw new Error('Invalid JSON format received from PyDiver');
                }
            } else {
                throw new Error('Invalid data format received from PyDiver');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setIsPyDiverLoading(false);
        }
    };

    // Function to fetch and load collection documents
    const loadCollection = async () => {
        if (!selectedCollection || !selectedDatabase) return;

        setIsLoadingCollection(true);
        setError(null);

        try {
            // Load the entire collection as a JSON array
            const allDocuments: any[] = [];
            let page = 0;
            const pageSize = 100; // Larger page size for efficiency
            let hasMoreDocuments = true;

            // Fetch all pages of documents
            while (hasMoreDocuments) {
                const result = await apiFetchDocuments(selectedCollection, page, pageSize, selectedDatabase);

                if (result.documents && result.documents.length > 0) {
                    allDocuments.push(...result.documents);

                    // Check if we've loaded all documents
                    if (allDocuments.length >= result.total || result.documents.length < pageSize) {
                        hasMoreDocuments = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMoreDocuments = false;
                }
            }

            if (allDocuments.length > 0) {
                // Process the entire collection as one JSON array
                const formattedData: string = formatJsonLikeData(allDocuments);

                if (isValidJson(formattedData)) {
                    // Pass the MongoDB option when setting the JSON
                    setStringifiedJson(formattedData, {isMongoData: true});
                    resetSelectedNode();
                    closeModal();
                } else {
                    throw new Error('Invalid JSON format received');
                }
            } else {
                throw new Error('No documents found in this collection');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load collection');
        } finally {
            setIsLoadingCollection(false);
        }
    };

    const isPyDiverInvalid = !isNull(error);
    const isDirectFetchDisabled = isPyDiverLoading || isPyDiverIdEmpty || isLoadingCollection;
    const isCollectionFetchDisabled = isLoadingCollection || !selectedCollection || isPyDiverLoading;

    return (
        <Modal closeButton isOpen={isModalOpen} onClose={closeModal}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader>Import PyDiver JSON</ModalHeader>
                        <ModalBody className="gap-3 pb-5">
                            {/* PyDiver ID Section */}
                            <div className="flex gap-x-2">
                                <Input
                                    aria-label="PyDiver ID input"
                                    classNames={{
                                        inputWrapper: ['h-10'],
                                    }}
                                    size="sm"
                                    variant="bordered"
                                    isClearable
                                    isDisabled={isPyDiverLoading || isLoadingCollection}
                                    isInvalid={isPyDiverInvalid}
                                    color={isPyDiverInvalid ? 'danger' : 'primary'}
                                    errorMessage={isPyDiverInvalid ? error || 'PyDiver fetch failed' : undefined}
                                    value={pyDiverIdValue}
                                    placeholder="Enter a PyDiver ID"
                                    onChange={handlePyDiverIdChange}
                                    onClear={handlePyDiverIdClear}
                                    onKeyDown={handlePyDiverIdKeyDown}
                                />
                                <Button
                                    variant="flat"
                                    color="primary"
                                    isLoading={isPyDiverLoading}
                                    isDisabled={isDirectFetchDisabled}
                                    onPress={fetchPyDiverDocument}
                                >
                                    Fetch
                                </Button>
                            </div>

                            <Text className="text-center text-xs">or</Text>

                            {/* Database Selection */}
                            <Select
                                label=""
                                placeholder="Select a database"
                                selectedKeys={selectedDatabase ? [selectedDatabase] : []}
                                onSelectionChange={handleDatabaseChange}
                                isDisabled={isPyDiverLoading || isLoadingCollection}
                            >
                                {AVAILABLE_DATABASES.map((db) => (
                                    <SelectItem key={db.id} value={db.id}>
                                        {db.name}
                                    </SelectItem>
                                ))}
                            </Select>

                            {/* Collection Selection and Load Button */}
                            <div className="flex gap-x-2">
                                <Select
                                    label=""
                                    placeholder="Select a collection"
                                    selectedKeys={selectedCollection ? [selectedCollection] : []}
                                    onSelectionChange={handleCollectionChange}
                                    className="flex-grow"
                                    isDisabled={isPyDiverLoading || isLoadingCollections || collections.length === 0 || isLoadingCollection}
                                    isLoading={isLoadingCollections}
                                    classNames={{
                                        listboxWrapper: "max-h-[240px]", // Add scrolling for long collection lists
                                        popoverContent: "overflow-hidden",
                                        listbox: "overflow-y-auto overflow-x-hidden",
                                        trigger: "w-full",
                                        base: "max-w-full",
                                    }}
                                    popoverProps={{
                                        placement: "bottom",
                                        offset: 5,
                                        // Ensure the popover doesn't overflow its container
                                        classNames: {
                                            content: "w-auto max-w-[calc(100%-70px)]"
                                        }
                                    }}
                                >
                                    {collections.map((collection) => (
                                        <SelectItem key={collection} value={collection}>
                                            {collection}
                                        </SelectItem>
                                    ))}
                                </Select>
                                <Button
                                    className="self-end h-10"
                                    variant="flat"
                                    color="primary"
                                    isLoading={isLoadingCollection}
                                    isDisabled={isCollectionFetchDisabled}
                                    onPress={loadCollection}
                                >
                                    Load
                                </Button>
                            </div>

                            {/* Error display (if needed) */}
                            {error && (
                                <Text className="text-danger text-center text-sm">{error}</Text>
                            )}
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export const PyDiverImportModal = memo(_PyDiverImportModal);