import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

import { Colors } from '@/constants/theme';
import {
  checkForUpdate,
  getCurrentVersion,
  openUpdateDownload,
  type UpdateInfo,
} from '@/lib/updates/github-updater';

type Palette = typeof Colors.light;

export function UpdateSection({ palette }: { palette: Palette }) {
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('Updates are checked automatically once per day.');
  const [update, setUpdate] = useState<UpdateInfo>();

  async function handleCheck() {
    setIsChecking(true);
    setUpdate(undefined);

    try {
      const result = await checkForUpdate();
      if (result.status === 'available') {
        setUpdate(result.update);
        setMessage(`Version ${result.update.version} is ready to install.`);
      } else if (result.status === 'current') {
        setMessage(`Version ${result.currentVersion} is up to date.`);
      } else {
        setMessage(`Update check failed: ${result.message}`);
      }
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: palette.surface }]}>
      <Card.Content style={styles.section}>
        <Text variant="titleLarge" style={[styles.title, { color: palette.text }]}>Updates</Text>
        <Text variant="bodyMedium" style={{ color: palette.muted }}>
          Installed version: {getCurrentVersion()}
        </Text>
        <Text variant="bodySmall" style={{ color: palette.muted }}>{message}</Text>
        {update ? (
          <Button mode="contained" onPress={() => void openUpdateDownload(update)}>
            Download version {update.version}
          </Button>
        ) : (
          <Button mode="outlined" loading={isChecking} onPress={() => void handleCheck()}>
            Check for updates
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18 },
  section: { gap: 12 },
  title: { fontWeight: '600' },
});
