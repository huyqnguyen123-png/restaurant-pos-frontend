import AsyncStorage from '@react-native-async-storage/async-storage';

const PASSWORD_KEY = 'history_password';

// Returns the stored password, or null if no password protection has been set up yet.
export async function getHistoryPassword(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PASSWORD_KEY);
  } catch {
    return null;
  }
}

export async function isHistoryPasswordSet(): Promise<boolean> {
  const pw = await getHistoryPassword();
  return pw !== null && pw.length > 0;
}

export async function setHistoryPassword(password: string): Promise<void> {
  await AsyncStorage.setItem(PASSWORD_KEY, password);
}

export async function removeHistoryPassword(): Promise<void> {
  await AsyncStorage.removeItem(PASSWORD_KEY);
}