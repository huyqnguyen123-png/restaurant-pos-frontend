import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';

// A TextInput wrapper with a Heroicons eye icon to toggle showing/hiding the
// entered password. Reused across every password field in the app.
export default function PasswordInput({ style, ...props }: TextInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, style]}
        secureTextEntry={!visible}
        {...props}
      />
      <TouchableOpacity style={styles.toggle} onPress={() => setVisible((v) => !v)}>
        {visible ? (
          <EyeSlashIcon size={20} color="#666" />
        ) : (
          <EyeIcon size={20} color="#666" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 44,
    fontSize: 15,
  },
  toggle: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
});