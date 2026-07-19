import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

const ACTION_WIDTH = 80;

export interface SwipeableRowHandle {
  close: () => void;
}

interface Props {
  children: React.ReactNode;
  renderRightAction: () => React.ReactNode;
}

// A minimal swipe-to-reveal-action row built entirely on React Native's
// built-in PanResponder/Animated APIs — no native module, no CMake build,
// avoiding the react-native-gesture-handler version-compatibility issues.
const SwipeableRow = forwardRef<SwipeableRowHandle, Props>(
  ({ children, renderRightAction }, ref) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const currentOffset = useRef(0);

    useImperativeHandle(ref, () => ({
      close: () => {
        currentOffset.current = 0;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    }));

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          const newValue = currentOffset.current + gestureState.dx;
          translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(0, newValue)));
        },
        onPanResponderRelease: (_, gestureState) => {
          const newValue = currentOffset.current + gestureState.dx;
          const shouldOpen = newValue < -ACTION_WIDTH / 2;
          currentOffset.current = shouldOpen ? -ACTION_WIDTH : 0;
          Animated.spring(translateX, {
            toValue: currentOffset.current,
            useNativeDriver: true,
          }).start();
        },
      })
    ).current;

    return (
      <View style={styles.container}>
        <View style={styles.actionsContainer}>{renderRightAction()}</View>
        <Animated.View
          style={[styles.foreground, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    );
  }
);

export default SwipeableRow;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
  },
  foreground: {
    backgroundColor: '#fff',
  },
});