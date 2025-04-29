'use client';

import {Button} from '@nextui-org/button';
import {Input} from '@nextui-org/input';
import {Modal, ModalBody, ModalContent, ModalHeader} from '@nextui-org/modal';
import {ComponentProps, memo, useCallback, useEffect, useState} from 'react';
import {useJsonDiagramViewStore} from '../../store/json-diagram-view/json-diagram-view.store';
import {useJsonEngineStore} from '../../store/json-engine/json-engine.store';
import {Text} from '../../ui/components/Text';
import {formatJsonLikeData, isArray, isNull, isObject, isValidJson} from '../../utils/json.util';
import {useSimpleFetch} from '../../utils/react-hooks/useSimpleFetch';
import {useString} from '../../utils/react-hooks/useString';
import {DragDropJsonFile} from './DragDropJsonFile';

type Props = {
  isModalOpen: boolean;
  closeModal: () => void;
};

const _ImportJsonModal = ({ isModalOpen, closeModal }: Props) => {
  // Existing URL fetch state
  const {
    string: jsonUrlValue,
    isEmpty: isJsonUrlValueEmpty,
    setString: setJsonUrlValue,
    clearString: clearJsonUrlValue,
  } = useString();
  const {
    loading: isGetJsonLoading,
    data: getJsonResponse,
    error: getJsonError,
    fetchUrl: fetchJsonUrl,
    resetError: resetGetJsonError,
  } = useSimpleFetch();

  // PyDiver document ID state
  const {
    string: pyDiverIdValue,
    isEmpty: isPyDiverIdEmpty,
    setString: setPyDiverIdValue,
    clearString: clearPyDiverIdValue,
  } = useString();

  // PyDiver loading state
  const [isPyDiverLoading, setIsPyDiverLoading] = useState(false);
  const [pyDiverError, setPyDiverError] = useState<Error | null>(null);

  const setStringifiedJson = useJsonEngineStore((state) => state.setStringifiedJson);
  const resetSelectedNode = useJsonDiagramViewStore((state) => state.resetSelectedNode);

  // Handle JSON URL input changes
  const handleJsonUrlValueChange: ComponentProps<typeof Input>['onChange'] = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setJsonUrlValue(e.target.value);
      resetGetJsonError();
    },
    [setJsonUrlValue, resetGetJsonError],
  );

  const handleJsonUrlValueClear: ComponentProps<typeof Input>['onClear'] = useCallback(() => {
    clearJsonUrlValue();
    resetGetJsonError();
  }, [clearJsonUrlValue, resetGetJsonError]);

  const handleJsonUrlInputKeyDown: ComponentProps<typeof Input>['onKeyDown'] = (e) => {
    if (e.key === 'Enter' && !isJsonUrlValueEmpty) {
      fetchJsonUrl(jsonUrlValue);
    }
  };

  // Handle PyDiver ID input changes
  const handlePyDiverIdChange: ComponentProps<typeof Input>['onChange'] = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setPyDiverIdValue(e.target.value);
        setPyDiverError(null);
      },
      [setPyDiverIdValue],
  );

  const handlePyDiverIdClear: ComponentProps<typeof Input>['onClear'] = useCallback(() => {
    clearPyDiverIdValue();
    setPyDiverError(null);
  }, [clearPyDiverIdValue]);

  const handlePyDiverIdKeyDown: ComponentProps<typeof Input>['onKeyDown'] = (e) => {
    if (e.key === 'Enter' && !isPyDiverIdEmpty) {
      fetchPyDiverDocument();
    }
  };

  // Reset form on modal close
  useEffect(() => {
    if (!isModalOpen) {
      resetGetJsonError();
      clearJsonUrlValue();
      clearPyDiverIdValue();
      setPyDiverError(null);
    }
  }, [
    isModalOpen,
    resetGetJsonError,
    clearJsonUrlValue,
    clearPyDiverIdValue
  ]);

  // Process JSON response from URL
  useEffect(() => {
    if (isObject(getJsonResponse) || isArray(getJsonResponse)) {
      const formattedData: string = formatJsonLikeData(getJsonResponse);

      if (isValidJson(formattedData)) {
        setStringifiedJson(formattedData);
        resetSelectedNode();
        closeModal();
      }
    }
  }, [getJsonResponse, setStringifiedJson, resetSelectedNode, closeModal]);

  // Function to fetch PyDiver document
  const fetchPyDiverDocument = async () => {
    if (isPyDiverIdEmpty) return;

    setIsPyDiverLoading(true);
    setPyDiverError(null);

    try {
      const response = await fetch(`/api/pydiver/${pyDiverIdValue}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const data = await response.json();

      // Process the document
      if (isObject(data) || isArray(data)) {
        const formattedData: string = formatJsonLikeData(data);

        if (isValidJson(formattedData)) {
          setStringifiedJson(formattedData);
          resetSelectedNode();
          closeModal();
        } else {
          throw new Error('Invalid JSON format received from PyDiver');
        }
      } else {
        throw new Error('Invalid data format received from PyDiver');
      }
    } catch (error) {
      setPyDiverError(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setIsPyDiverLoading(false);
    }
  };

  const isUrlInvalid = !isNull(getJsonError);
  const isPyDiverInvalid = !isNull(pyDiverError);

  return (
    <Modal closeButton isOpen={isModalOpen} onClose={closeModal}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Import JSON via URL, File, or PyDiver</ModalHeader>
            <ModalBody className="gap-3">
              {/* URL Import Section */}
              <div className="flex gap-x-2">
                <Input
                  aria-label="JSON URL input"
                  classNames={{
                    inputWrapper: ['h-10'],
                  }}
                  size="sm"
                  variant="bordered"
                  isClearable
                  isDisabled={isGetJsonLoading}
                  isInvalid={isUrlInvalid}
                  color={isUrlInvalid ? 'danger' : 'primary'}
                  errorMessage={isUrlInvalid ? 'Fetching JSON via URL failed for some reason' : undefined}
                  value={jsonUrlValue}
                  placeholder="Enter a JSON URL to fetch"
                  onChange={handleJsonUrlValueChange}
                  onClear={handleJsonUrlValueClear}
                  onKeyDown={handleJsonUrlInputKeyDown}
                />
                <Button
                  variant="flat"
                  color="primary"
                  isLoading={isGetJsonLoading}
                  isDisabled={isJsonUrlValueEmpty}
                  onPress={() => fetchJsonUrl(jsonUrlValue)}
                >
                  Fetch
                </Button>
              </div>

              <Text className="text-center text-xs">or</Text>

              {/* File Drop Section */}
              <DragDropJsonFile afterFileReadSuccess={closeModal} />

              <Text className="text-center text-xs">or</Text>

              {/* PyDiver Import Section */}
              <div className="flex gap-x-2">
                <Input
                    aria-label="PyDiver Document ID"
                    classNames={{
                      inputWrapper: ['h-10'],
                    }}
                    size="sm"
                    variant="bordered"
                    isClearable
                    isDisabled={isPyDiverLoading}
                    isInvalid={isPyDiverInvalid}
                    color={isPyDiverInvalid ? 'danger' : 'primary'}
                    errorMessage={isPyDiverInvalid ? pyDiverError?.message || 'Fetching document failed' : undefined}
                    value={pyDiverIdValue}
                    placeholder="Enter PyDiver document ID"
                    onChange={handlePyDiverIdChange}
                    onClear={handlePyDiverIdClear}
                    onKeyDown={handlePyDiverIdKeyDown}
                />
                <Button
                    variant="flat"
                    color="primary"
                    isLoading={isPyDiverLoading}
                    isDisabled={isPyDiverIdEmpty}
                    onPress={fetchPyDiverDocument}
                >
                  Fetch
                </Button>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export const ImportJsonModal = memo(_ImportJsonModal);