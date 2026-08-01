import { getDb } from '@/database/client';
import { appSettings, collection, collectionSettings } from '@/store';
import type { AppSettingsParams, CollectionSettingsParams } from '@/types';
import { get } from 'svelte/store';

export const loadSettings = async (loadApp: boolean, loadCollection: boolean) => {
  if (loadApp) {
    // Load app settings from local storage
    const appSettingsData = window.localStorage.getItem('appSettings');
    if (appSettingsData) {
      appSettings.set(JSON.parse(appSettingsData));
    } else {
      setSettings('app');
    }
  }

  if (loadCollection) {
    const stored = await getDb().get('collectionSettings', get(collection));
    if (stored) {
      collectionSettings.set({ editor: stored.editor, notes: stored.notes });
    } else {
      setSettings('collection');
    }
  }
};

export const setSettings = async (
  settingsType: 'app' | 'collection',
  value?: AppSettingsParams | CollectionSettingsParams
) => {
  if (settingsType === 'app') {
    appSettings.set((value ?? get(appSettings)) as AppSettingsParams);
    window.localStorage.setItem('appSettings', JSON.stringify(value ?? get(appSettings)));
  }
  if (settingsType === 'collection') {
    collectionSettings.set((value ?? get(collectionSettings)) as CollectionSettingsParams);
    const next = (value ?? get(collectionSettings)) as CollectionSettingsParams;
    // `put` upserts on the keyPath, replacing the insert-on-conflict-update.
    await getDb().put('collectionSettings', {
      collectionPath: get(collection),
      editor: next.editor,
      notes: next.notes
    });
  }
};
