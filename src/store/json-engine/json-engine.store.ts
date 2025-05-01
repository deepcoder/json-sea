import {Edge} from 'reactflow';
import {create} from 'zustand';
import {Entities} from '../../utils/array.util';
import {isValidJson} from '../../utils/json.util';
import {convertJsonTree} from './helpers/json-engine.helper';
import {DEFAULT_STRINGIFIED_JSON} from './json-engine.constant';
import {SeaNode} from './types/sea-node.type';

export type JsonTree = {
    seaNodes: SeaNode[];
    seaNodeEntities: Entities<SeaNode>;
    edges: Edge[];
};


type State = {
    stringifiedJson: string;
    isValidJson: boolean;
    latestValidStringifiedJson: string;
    jsonTree: JsonTree;
};

export type JsonParserOptions = {
    isMongoData?: boolean;
    skipRootEdges?: boolean;
};

type Actions = {
    setStringifiedJson: (json: string, options?: JsonParserOptions) => void;
    resetJsonEngineStore: () => void;
};

const initialState: State = {
    stringifiedJson: DEFAULT_STRINGIFIED_JSON,
    isValidJson: isValidJson(DEFAULT_STRINGIFIED_JSON),
    latestValidStringifiedJson: DEFAULT_STRINGIFIED_JSON,
    jsonTree: convertJsonTree(JSON.parse(DEFAULT_STRINGIFIED_JSON)),
};

export const useJsonEngineStore = create<State & Actions>((set) => ({
    ...initialState,
    setStringifiedJson: (stringifiedJson: string, options?: JsonParserOptions) => {
        set(() =>
            isValidJson(stringifiedJson)
                ? {
                    stringifiedJson,
                    isValidJson: true,
                    latestValidStringifiedJson: stringifiedJson,
                    jsonTree: convertJsonTree(JSON.parse(stringifiedJson), options),
                }
                : {
                    stringifiedJson,
                    isValidJson: false,
                },
        );
    },
    resetJsonEngineStore: () => set(initialState),
}));
