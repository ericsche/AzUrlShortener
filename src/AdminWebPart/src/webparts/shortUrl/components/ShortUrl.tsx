import * as React from 'react';
import { getTheme } from '@fluentui/react';
import {
  AddSquare24Regular,
  Archive24Regular,
  Copy24Regular,
  Edit24Regular
} from '@fluentui/react-icons';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  FluentProvider,
  Input,
  Label,
  Link,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Toolbar,
  ToolbarButton,
  webDarkTheme,
  webLightTheme
} from '@fluentui/react-components';

import styles from './ShortUrl.module.scss';
import { IShortUrlProps, IShortUrlRequest, IUrlInfo } from './IShortUrlProps';

type DialogMode = 'create' | 'edit' | undefined;

interface IEditorState {
  title: string;
  url: string;
  vanity: string;
}

const emptyEditor: IEditorState = {
  title: '',
  url: '',
  vanity: ''
};

const ShortUrl: React.FC<IShortUrlProps> = ({ apiClient, isDarkTheme }) => {
  const [urls, setUrls] = React.useState<IUrlInfo[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const [dialogMode, setDialogMode] = React.useState<DialogMode>();
  const [selectedUrl, setSelectedUrl] = React.useState<IUrlInfo>();
  const [editor, setEditor] = React.useState<IEditorState>(emptyEditor);

  const loadUrls = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      setUrls(await apiClient.getUrls());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les liens.');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  React.useEffect(() => {
    loadUrls().catch(loadError => {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les liens.');
    });
  }, [loadUrls]);

  const openCreateDialog = (): void => {
    setSelectedUrl(undefined);
    setEditor(emptyEditor);
    setDialogMode('create');
  };

  const openEditDialog = (url: IUrlInfo): void => {
    setSelectedUrl(url);
    setEditor({
      title: url.title,
      url: url.url,
      vanity: url.rowKey
    });
    setDialogMode('edit');
  };

  const closeDialog = (): void => {
    if (!saving) {
      setDialogMode(undefined);
      setSelectedUrl(undefined);
      setEditor(emptyEditor);
    }
  };

  const saveUrl = async (): Promise<void> => {
    const title = editor.title.trim();
    const url = editor.url.trim();
    const vanity = editor.vanity.trim().toLowerCase();

    if (!title || !url || !vanity) {
      setError('Le titre, l’URL source et le nom court sont obligatoires.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (dialogMode === 'edit' && selectedUrl) {
        await apiClient.updateUrl({
          ...selectedUrl,
          title,
          url
        });
      } else {
        const request: IShortUrlRequest = {
          title,
          url,
          vanity,
          schedules: []
        };
        await apiClient.createUrl(request);
      }

      setDialogMode(undefined);
      await loadUrls();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer le lien.');
    } finally {
      setSaving(false);
    }
  };

  const archiveUrl = async (url: IUrlInfo): Promise<void> => {
    if (!window.confirm(`Archiver le lien « ${url.title || url.rowKey} » ?`)) {
      return;
    }

    setError('');
    try {
      await apiClient.archiveUrl(url);
      await loadUrls();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Impossible d’archiver le lien.');
    }
  };

  const copyUrl = async (url: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setError('Impossible de copier le lien dans le presse-papiers.');
    }
  };

  const theme = getTheme();

  return (
    <FluentProvider theme={isDarkTheme ? webDarkTheme : webLightTheme}>
      <section className={styles.shortUrl}>
        <Toolbar aria-label="Actions" style={{ boxShadow: theme.effects.elevation4 }}>
          <ToolbarButton onClick={openCreateDialog} icon={<AddSquare24Regular />}>
            Nouveau lien
          </ToolbarButton>
        </Toolbar>
        <Divider />

        {error && <div className={styles.error} role="alert">{error}</div>}

        {loading ? (
          <Spinner label="Chargement des liens..." />
        ) : (
          <Table aria-label="Liens courts">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Titre</TableHeaderCell>
                <TableHeaderCell>Lien court</TableHeaderCell>
                <TableHeaderCell>URL cible</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urls.map(item => (
                <TableRow key={item.rowKey}>
                  <TableCell>
                    <TableCellLayout>{item.title}</TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <TableCellLayout>
                      <Link href={item.shortUrl} target="_blank" rel="noreferrer">
                        {item.shortUrl}
                      </Link>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <TableCellLayout>{item.url}</TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <div className={styles.actions}>
                      <Button
                        appearance="subtle"
                        icon={<Copy24Regular />}
                        title="Copier"
                        onClick={() => copyUrl(item.shortUrl).catch(() => setError('Impossible de copier le lien.'))}
                      />
                      <Button
                        appearance="subtle"
                        icon={<Edit24Regular />}
                        title="Modifier"
                        onClick={() => openEditDialog(item)}
                      />
                      <Button
                        appearance="subtle"
                        icon={<Archive24Regular />}
                        title="Archiver"
                        onClick={() => archiveUrl(item).catch(() => setError('Impossible d’archiver le lien.'))}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogMode !== undefined} onOpenChange={(_, data) => !data.open && closeDialog()}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>
                {dialogMode === 'edit' ? 'Modifier un lien' : 'Créer un nouveau lien'}
              </DialogTitle>
              <DialogContent className={styles.form}>
                <Label htmlFor="short-url-title">Titre</Label>
                <Input
                  id="short-url-title"
                  value={editor.title}
                  onChange={(_, data) => setEditor(current => ({ ...current, title: data.value }))}
                />

                <Label htmlFor="short-url-target">URL source</Label>
                <Input
                  id="short-url-target"
                  type="url"
                  value={editor.url}
                  onChange={(_, data) => setEditor(current => ({ ...current, url: data.value }))}
                />

                <Label htmlFor="short-url-vanity">Nom court</Label>
                <Input
                  id="short-url-vanity"
                  value={editor.vanity}
                  disabled={dialogMode === 'edit'}
                  onChange={(_, data) => setEditor(current => ({ ...current, vanity: data.value }))}
                />
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" disabled={saving} onClick={closeDialog}>
                  Annuler
                </Button>
                <Button appearance="primary" disabled={saving} onClick={() => saveUrl().catch(() => setError('Impossible d’enregistrer le lien.'))}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </section>
    </FluentProvider>
  );
};

export default ShortUrl;
