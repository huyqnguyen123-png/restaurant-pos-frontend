import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getStoredBackendHost, saveBackendHost, buildBaseUrl } from '../utils/backendConfig';
import { apiClient, setApiClientHost } from '../api/client';
import {
  getHistoryPassword,
  isHistoryPasswordSet,
  setHistoryPassword,
  removeHistoryPassword,
} from '../utils/historyPassword';
import PasswordInput from '../components/PasswordInput';

type PasswordFormMode =
  | 'idle'
  | 'settingNew'
  | 'verifyingOld'
  | 'enteringNewAfterVerify'
  | 'confirmingRemove';

export default function SettingsScreen() {
  // --- backend address section ---
  const [host, setHost] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- history password section ---
  const [passwordSet, setPasswordSet] = useState(false);
  const [formMode, setFormMode] = useState<PasswordFormMode>('idle');
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [removePasswordInput, setRemovePasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getStoredBackendHost().then((h) => {
      setHost(h);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      isHistoryPasswordSet().then(setPasswordSet);
    }, [])
  );

  const handleTestConnection = async () => {
    if (!host.trim()) {
      Alert.alert('Validation error', 'Please enter an address first');
      return;
    }
    setTesting(true);
    const previousBaseUrl = apiClient.defaults.baseURL;
    try {
      apiClient.defaults.baseURL = buildBaseUrl(host.trim());
      await apiClient.get('/menu-items');
      Alert.alert('Success', 'Connected to the backend successfully.');
    } catch (error) {
      apiClient.defaults.baseURL = previousBaseUrl;
      Alert.alert(
        'Connection failed',
        'Could not reach the backend. Check the IP address, port, and that both devices are on the same Wi-Fi network.'
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!host.trim()) {
      Alert.alert('Validation error', 'Please enter a backend address (e.g. 192.168.1.10:8080)');
      return;
    }
    try {
      setSaving(true);
      await saveBackendHost(host.trim());
      setApiClientHost(host.trim());
      Alert.alert('Saved', 'Backend address updated.');
    } finally {
      setSaving(false);
    }
  };

  // --- history password handlers ---

  const resetPasswordForm = () => {
    setFormMode('idle');
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setRemovePasswordInput('');
  };

  const startSetPassword = () => {
    setFormMode('settingNew');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  const startChangePassword = () => {
    setFormMode('verifyingOld');
    setOldPasswordInput('');
  };

  const startRemovePassword = () => {
    setFormMode('confirmingRemove');
    setRemovePasswordInput('');
  };

  const handleVerifyOldPassword = async () => {
    const stored = await getHistoryPassword();
    if (oldPasswordInput !== stored) {
      Alert.alert('Incorrect password', 'The current password you entered is incorrect.');
      return;
    }
    setFormMode('enteringNewAfterVerify');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  const handleSaveNewPassword = async () => {
    if (!newPasswordInput || newPasswordInput.length < 4) {
      Alert.alert('Validation error', 'Password must be at least 4 characters');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      Alert.alert('Validation error', 'Passwords do not match');
      return;
    }
    try {
      setSavingPassword(true);
      await setHistoryPassword(newPasswordInput);
      setPasswordSet(true);
      resetPasswordForm();
      Alert.alert('Saved', 'History password updated.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Removing the password now requires re-entering the CURRENT password
  // correctly first, instead of just a confirmation dialog.
  const handleConfirmRemove = async () => {
    const stored = await getHistoryPassword();
    if (removePasswordInput !== stored) {
      Alert.alert('Incorrect password', 'The current password you entered is incorrect.');
      return;
    }
    await removeHistoryPassword();
    setPasswordSet(false);
    resetPasswordForm();
    Alert.alert('Removed', 'History password protection has been removed.');
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Backend server address</Text>
      <Text style={styles.hint}>
        Cloud backend: just the domain (e.g. myapp.up.railway.app){'\n'}
        Local network: full URL with http:// (e.g. http://192.168.1.10:8080)
      </Text>
      <TextInput
        style={styles.input}
        value={host}
        onChangeText={setHost}
        placeholder="myapp.up.railway.app"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.testButton} onPress={handleTestConnection} disabled={testing}>
          <Text style={styles.testButtonText}>{testing ? 'Testing...' : 'Test Connection'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <Text style={styles.label}>History password protection</Text>
      <Text style={styles.hint}>
        {passwordSet
          ? 'A password is required every time History is opened.'
          : 'No password set — History is open to anyone.'}
      </Text>

      {formMode === 'idle' && (
        <View style={styles.buttonRow}>
          {!passwordSet ? (
            <TouchableOpacity style={styles.testButton} onPress={startSetPassword}>
              <Text style={styles.testButtonText}>Set Password</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.testButton} onPress={startChangePassword}>
                <Text style={styles.testButtonText}>Change Password</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={startRemovePassword}>
                <Text style={styles.saveButtonText}>Remove</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {formMode === 'settingNew' && (
        <View style={styles.passwordForm}>
          <PasswordInput
            placeholder="New password"
            value={newPasswordInput}
            onChangeText={setNewPasswordInput}
          />
          <PasswordInput
            placeholder="Confirm new password"
            value={confirmPasswordInput}
            onChangeText={setConfirmPasswordInput}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveNewPassword} disabled={savingPassword}>
              <Text style={styles.saveButtonText}>{savingPassword ? 'Saving...' : 'Save Password'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={resetPasswordForm}>
              <Text style={styles.testButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {formMode === 'verifyingOld' && (
        <View style={styles.passwordForm}>
          <PasswordInput
            placeholder="Current password"
            value={oldPasswordInput}
            onChangeText={setOldPasswordInput}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveButton} onPress={handleVerifyOldPassword}>
              <Text style={styles.saveButtonText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={resetPasswordForm}>
              <Text style={styles.testButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {formMode === 'enteringNewAfterVerify' && (
        <View style={styles.passwordForm}>
          <PasswordInput
            placeholder="New password"
            value={newPasswordInput}
            onChangeText={setNewPasswordInput}
          />
          <PasswordInput
            placeholder="Confirm new password"
            value={confirmPasswordInput}
            onChangeText={setConfirmPasswordInput}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveNewPassword} disabled={savingPassword}>
              <Text style={styles.saveButtonText}>{savingPassword ? 'Saving...' : 'Save Password'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={resetPasswordForm}>
              <Text style={styles.testButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {formMode === 'confirmingRemove' && (
        <View style={styles.passwordForm}>
          <Text style={styles.hint}>Enter the current password to remove protection.</Text>
          <PasswordInput
            placeholder="Current password"
            value={removePasswordInput}
            onChangeText={setRemovePasswordInput}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.removeButton} onPress={handleConfirmRemove}>
              <Text style={styles.saveButtonText}>Confirm Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={resetPasswordForm}>
              <Text style={styles.testButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  loader: { flex: 1, marginTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 12, color: '#999', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  testButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testButtonText: { color: '#fff', fontWeight: 'bold' },
  saveButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  removeButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  passwordForm: {
    marginTop: 4,
  },
});