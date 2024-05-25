import * as React from 'react';

import {
  Box,
  Button,
  Typography,
  ModalFooter,
  Tr,
  Td,
  IconButton,
  Flex,
  Icon,
  Tooltip,
  Loader,
} from '@strapi/design-system';
import {
  useTableContext,
  Table as HelperPluginTable,
  getYupInnerErrors,
  useFetchClient,
  useQueryParams,
  useNotification,
  TranslationMessage,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { Entity } from '@strapi/types';
import { AxiosError, AxiosResponse } from 'axios';
import { MessageDescriptor, useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Link, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { ValidationError } from 'yup';

import { useTypedSelector } from '../../../../../core/store/hooks';
import { getTranslation } from '../../../../utils/translations';
import { createYupSchema } from '../../../../utils/validation';
import { useAllowedActions } from '../../hooks/useAllowedActions';
import { Table } from '../Table';

import { ConfirmDialogPublishAll } from './ConfirmBulkActionDialog';

import type { BulkActionComponent } from '../../../../../core/apis/content-manager';

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

interface EntryValidationTextProps {
  validationErrors?: Record<string, MessageDescriptor>;
  isPublished?: boolean;
}

const EntryValidationText = ({
  validationErrors,
  isPublished = false,
}: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  if (validationErrors) {
    const validationErrorsMessages = Object.entries(validationErrors)
      .map(([key, value]) =>
        formatMessage(
          { id: `${value.id}.withField`, defaultMessage: value.defaultMessage },
          { field: key }
        )
      )
      .join(' ');

    return (
      <Flex gap={2}>
        <Icon color="danger600" as={CrossCircle} />
        <Tooltip description={validationErrorsMessages}>
          <TypographyMaxWidth textColor="danger600" variant="omega" fontWeight="semiBold" ellipsis>
            {validationErrorsMessages}
          </TypographyMaxWidth>
        </Tooltip>
      </Flex>
    );
  }

  if (isPublished) {
    return (
      <Flex gap={2}>
        <Icon color="success600" as={CheckCircle} />
        <Typography textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'content-manager.bulk-publish.already-published',
            defaultMessage: 'Already Published',
          })}
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex gap={2}>
      <Icon color="success600" as={CheckCircle} />
      <Typography>
        {formatMessage({
          id: 'app.utils.ready-to-publish',
          defaultMessage: 'Ready to publish',
        })}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesTableContent
 * -----------------------------------------------------------------------------------------------*/

interface SelectedEntriesTableContentProps {
  isPublishing?: boolean;
  rowsToDisplay?: TableRow[];
  entriesToPublish?: Entity.ID[];
  validationErrors: Record<string, EntryValidationTextProps['validationErrors']>;
}

const SelectedEntriesTableContent = ({
  isPublishing,
  rowsToDisplay = [],
  entriesToPublish = [],
  validationErrors = {},
}: SelectedEntriesTableContentProps) => {
  const {
    location: { pathname },
  } = useHistory();
  const { formatMessage } = useIntl();

  const contentTypeSettings = useTypedSelector(
    (state) => state['content-manager_listView'].contentType?.settings
  );
  const mainField = contentTypeSettings?.mainField;
  const shouldDisplayMainField = mainField != null && mainField !== 'id';

  return (
    <HelperPluginTable.Content>
      <HelperPluginTable.Head>
        <HelperPluginTable.HeaderCheckboxCell />
        <HelperPluginTable.HeaderCell fieldSchemaType="integer" label="id" name="id" />
        {shouldDisplayMainField && (
          <HelperPluginTable.HeaderCell fieldSchemaType="string" label="name" name="name" />
        )}
        <HelperPluginTable.HeaderCell fieldSchemaType="string" label="status" name="status" />
      </HelperPluginTable.Head>
      <HelperPluginTable.LoadingBody />
      <HelperPluginTable.Body>
        {rowsToDisplay.map((row, index) => (
          <Tr key={row.id}>
            <Td>
              <Table.CheckboxDataCell rowId={row.id} index={index} />
            </Td>
            <Td>
              <Typography>{row.id}</Typography>
            </Td>
            {shouldDisplayMainField && (
              <Td>
                <Typography>{row[mainField as keyof TableRow]}</Typography>
              </Td>
            )}
            <Td>
              {isPublishing && entriesToPublish.includes(row.id) ? (
                <Flex gap={2}>
                  <Typography>
                    {formatMessage({
                      id: 'content-manager.success.record.publishing',
                      defaultMessage: 'Publishing...',
                    })}
                  </Typography>
                  <Loader small />
                </Flex>
              ) : (
                <EntryValidationText
                  validationErrors={validationErrors[row.id]}
                  isPublished={row.publishedAt !== null}
                />
              )}
            </Td>
            <Td>
              <IconButton
                forwardedAs={Link}
                // @ts-expect-error – DS does not correctly infer props from the as prop.
                to={{
                  pathname: `${pathname}/${row.id}`,
                  state: { from: pathname },
                }}
                label={formatMessage(
                  { id: 'app.component.HelperPluginTable.edit', defaultMessage: 'Edit {target}' },
                  {
                    target: formatMessage(
                      {
                        id: 'content-manager.components.ListViewHelperPluginTable.row-line',
                        defaultMessage: 'item line {number}',
                      },
                      { number: index + 1 }
                    ),
                  }
                )}
                noBorder
                target="_blank"
                marginLeft="auto"
              >
                <Pencil />
              </IconButton>
            </Td>
          </Tr>
        ))}
      </HelperPluginTable.Body>
    </HelperPluginTable.Content>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks: React.ReactNode) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

interface SelectedEntriesModalContentProps
  extends Pick<SelectedEntriesTableContentProps, 'validationErrors'> {
  isDialogOpen: boolean;
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  refetchList: () => void;
  setSelectedListViewEntries: React.Dispatch<React.SetStateAction<Entity.ID[]>>;
  setEntriesToFetch: React.Dispatch<React.SetStateAction<Entity.ID[]>>;
  validationErrors: Record<string, EntryValidationTextProps['validationErrors']>;
  setIsPublishModalBtnDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

interface TableRow {
  id: Entity.ID;
  publishedAt: string | null;
}

const SelectedEntriesModalContent = ({
  refetchList,
  setEntriesToFetch,
  setSelectedListViewEntries,
  validationErrors = {},
  isDialogOpen,
  setIsDialogOpen,
  setIsPublishModalBtnDisabled,
}: SelectedEntriesModalContentProps) => {
  const { formatMessage } = useIntl();
  const { selectedEntries, rows, onSelectRow, isLoading } = useTableContext<TableRow>();
  const [rowsToDisplay, setRowsToDisplay] = React.useState<Array<TableRow>>([]);

  const [publishedCount, setPublishedCount] = React.useState(0);
  const { formatAPIError } = useAPIErrorHandler();

  const entriesToPublish = rows
    .filter(({ id }) => selectedEntries.includes(id) && !validationErrors[id])
    .map(({ id }) => id);

  const { post } = useFetchClient();
  const toggleNotification = useNotification();
  const { contentType } = useTypedSelector((state) => state['content-manager_listView']);
  const selectedEntriesWithErrorsCount = rowsToDisplay.filter(
    ({ id }) => selectedEntries.includes(id) && validationErrors[id]
  ).length;
  const selectedEntriesPublished = rowsToDisplay.filter(
    ({ id, publishedAt }) => selectedEntries.includes(id) && publishedAt
  ).length;
  const selectedEntriesWithNoErrorsCount =
    selectedEntries.length - selectedEntriesWithErrorsCount - selectedEntriesPublished;

  const bulkPublishMutation = useMutation<
    AxiosResponse<Contracts.CollectionTypes.BulkPublish.Response>,
    AxiosError<Required<Pick<Contracts.CollectionTypes.BulkPublish.Response, 'error'>>>,
    Contracts.CollectionTypes.BulkPublish.Request['body']
  >(
    (data) =>
      post(`/content-manager/collection-types/${contentType!.uid}/actions/bulkPublish`, data),
    {
      onSuccess() {
        const update = rowsToDisplay.filter((row) => {
          if (entriesToPublish.includes(row.id)) {
            // Deselect the entries that have been published from the modal table
            onSelectRow({ name: row.id, value: false });
          }

          // Remove the entries that have been published from the table
          return !entriesToPublish.includes(row.id);
        });

        setRowsToDisplay(update);
        const publishedIds = update.map(({ id }) => id);
        // Set the parent's entries to fetch when clicking refresh
        setEntriesToFetch(publishedIds);
        // Deselect the entries that were published in the list view
        setSelectedListViewEntries(publishedIds);

        if (update.length === 0) {
          refetchList();
        }

        toggleNotification({
          type: 'success',
          message: { id: 'content-manager.success.record.publish', defaultMessage: 'Published' },
        });
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const toggleDialog = () => setIsDialogOpen((prev) => !prev);

  const handleConfirmBulkPublish = async () => {
    toggleDialog();
    const { data } = await bulkPublishMutation.mutateAsync({ ids: entriesToPublish });
    setPublishedCount(data.count);
  };

  const getFormattedCountMessage = () => {
    if (publishedCount) {
      return formatMessage(
        {
          id: getTranslation('containers.ListPage.selectedEntriesModal.publishedCount'),
          defaultMessage:
            '<b>{publishedCount}</b> {publishedCount, plural, =0 {entries} one {entry} other {entries}} published. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
        },
        {
          publishedCount,
          withErrorsCount: selectedEntriesWithErrorsCount,
          b: BoldChunk,
        }
      );
    }

    return formatMessage(
      {
        id: getTranslation('containers.ListPage.selectedEntriesModal.selectedCount'),
        defaultMessage:
          '<b>{alreadyPublishedCount}</b> {alreadyPublishedCount, plural, =0 {entries} one {entry} other {entries}} already published. <b>{readyToPublishCount}</b> {readyToPublishCount, plural, =0 {entries} one {entry} other {entries}} ready to publish. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
      },
      {
        readyToPublishCount: selectedEntriesWithNoErrorsCount,
        withErrorsCount: selectedEntriesWithErrorsCount,
        alreadyPublishedCount: selectedEntriesPublished,
        b: BoldChunk,
      }
    );
  };

  React.useEffect(() => {
    // When the api responds with data
    if (rows.length > 0) {
      // Update the rows to display
      setRowsToDisplay(rows);
    }
  }, [rows, setRowsToDisplay]);

  React.useEffect(() => {
    if (
      selectedEntries.length === 0 ||
      selectedEntries.length === selectedEntriesWithErrorsCount ||
      isLoading
    ) {
      setIsPublishModalBtnDisabled(true);
    } else {
      setIsPublishModalBtnDisabled(false);
    }
  }, [isLoading, selectedEntries, selectedEntriesWithErrorsCount, setIsPublishModalBtnDisabled]);

  return (
    <>
      <Typography>{getFormattedCountMessage()}</Typography>
      <Box marginTop={5}>
        <SelectedEntriesTableContent
          isPublishing={bulkPublishMutation.isLoading}
          rowsToDisplay={rowsToDisplay}
          entriesToPublish={entriesToPublish}
          validationErrors={validationErrors}
        />
      </Box>
      <ConfirmDialogPublishAll
        isOpen={isDialogOpen}
        onToggleDialog={toggleDialog}
        isConfirmButtonLoading={bulkPublishMutation.isLoading}
        onConfirm={handleConfirmBulkPublish}
      />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PublishAction
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: BulkActionComponent = ({ model: slug }) => {
  const { formatMessage } = useIntl();

  const { selectedEntries } = useTableContext();
  const {
    data: list,
    contentType,
    components,
  } = useTypedSelector((state) => state['content-manager_listView']);
  const selectedEntriesObjects = list.filter((entry) => selectedEntries.includes(entry.id));
  const hasPublishPermission = useAllowedActions(slug).canPublish;
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const showPublishButton =
    hasPublishPermission && selectedEntriesObjects.some((entry) => !entry.publishedAt);
  const {
    selectedEntries: selectedListViewEntries,
    setSelectedEntries: setSelectedListViewEntries,
  } = useTableContext();
  const [isPublishModalBtnDisabled, setIsPublishModalBtnDisabled] = React.useState(true);

  // The child table will update this value based on the entries that were published
  const [entriesToFetch, setEntriesToFetch] = React.useState(selectedListViewEntries);
  // We want to keep the selected entries order same as the list view
  const [
    {
      query: { sort, plugins },
    },
  ] = useQueryParams<{ sort?: string; plugins?: Record<string, any> }>();

  const queryParams = {
    page: 1,
    pageSize: entriesToFetch.length,
    sort,
    filters: {
      id: {
        $in: entriesToFetch,
      },
    },
    locale: plugins?.i18n?.locale,
  };

  const { get } = useFetchClient();

  const {
    data = [],
    isLoading: isRootDataLoading,
    isFetching: isRootDataFetching,
    refetch: refetchModalData,
  } = useQuery(
    ['entries', contentType?.uid, queryParams],
    async () => {
      const { data } = await get<Contracts.CollectionTypes.Find.Response>(
        `content-manager/collection-types/${contentType!.uid}`,
        {
          params: queryParams,
        }
      );

      return data.results;
    },
    {
      enabled: contentType !== null,
    }
  );

  const { rows, validationErrors } = React.useMemo(() => {
    if (data.length > 0 && contentType) {
      const schema = createYupSchema(
        contentType,
        { components },
        { isDraft: false, isJSONTestDisabled: true }
      );
      const validationErrors: Record<Entity.ID, Record<string, TranslationMessage>> = {};
      const rows = data.map((entry) => {
        try {
          schema.validateSync(entry, { abortEarly: false });

          return entry;
        } catch (e) {
          if (e instanceof ValidationError) {
            validationErrors[entry.id] = getYupInnerErrors(e);
          }

          return entry;
        }
      });

      return { rows, validationErrors };
    }

    return {
      rows: [],
      validationErrors: {},
    };
  }, [components, contentType, data]);

  const refetchList = () => {
    queryClient.invalidateQueries(['content-manager', 'collection-types', slug]);
  };

  // If all the entries are published, we want to refetch the list view
  if (rows.length === 0) {
    refetchList();
  }

  if (!showPublishButton) return null;

  return {
    actionType: 'publish',
    variant: 'tertiary',
    label: formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' }),
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: getTranslation('containers.ListPage.selectedEntriesModal.title'),
        defaultMessage: 'Publish entries',
      }),
      content: (
        <HelperPluginTable.Root
          rows={rows}
          defaultSelectedEntries={selectedListViewEntries}
          colCount={4}
          isLoading={isRootDataLoading}
          isFetching={isRootDataFetching}
        >
          <SelectedEntriesModalContent
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
            refetchList={refetchList}
            setSelectedListViewEntries={setSelectedListViewEntries}
            setEntriesToFetch={setEntriesToFetch}
            validationErrors={validationErrors}
            setIsPublishModalBtnDisabled={setIsPublishModalBtnDisabled}
          />
        </HelperPluginTable.Root>
      ),
      footer: ({ onClose }) => {
        return (
          <ModalFooter
            startActions={
              <Button
                onClick={() => {
                  onClose();
                  refetchList();
                }}
                variant="tertiary"
              >
                {formatMessage({
                  id: 'app.components.Button.cancel',
                  defaultMessage: 'Cancel',
                })}
              </Button>
            }
            endActions={
              <Flex gap={2}>
                <Button onClick={() => refetchModalData()} variant="tertiary">
                  {formatMessage({ id: 'app.utils.refresh', defaultMessage: 'Refresh' })}
                </Button>
                <Button
                  onClick={() => setIsDialogOpen((prev) => !prev)}
                  disabled={isPublishModalBtnDisabled}
                  // TODO: in V5 when bulk actions are refactored, we should use the isLoading prop
                  // loading={bulkPublishMutation.isLoading}
                >
                  {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
                </Button>
              </Flex>
            }
          />
        );
      },
      onClose: () => {
        refetchList();
      },
    },
  };
};

export { PublishAction, SelectedEntriesModalContent };
