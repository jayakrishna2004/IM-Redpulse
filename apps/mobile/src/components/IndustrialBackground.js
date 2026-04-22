import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';

const { width, height } = Dimensions.get('window');

/**
 * IndustrialBackground
 * Provides a high-fidelity tactical backdrop for consistent theme across mobile.
 */
export default function IndustrialBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Deep Base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.base }]} />
      
      {/* Top Left Spotlight */}
      <LinearGradient
        colors={[COLORS.redSubtle, 'transparent']}
        style={[styles.glow, { top: -height * 0.2, left: -width * 0.2, width: width, height: width }]}
      />

      {/* Center Spotlight */}
      <LinearGradient
        colors={['rgba(26, 31, 60, 0.4)', 'transparent']}
        style={[styles.glow, { top: height * 0.1, left: -width * 0.3, width: width * 1.5, height: width * 1.5 }]}
      />

      {/* Right Accent */}
      <LinearGradient
        colors={['rgba(255, 26, 60, 0.05)', 'transparent']}
        style={[styles.glow, { bottom: -height * 0.1, right: -width * 0.2, width: width * 0.8, height: width * 0.8 }]}
      />

      {/* Grid Overlay (Tactical look) */}
      <View style={styles.gridOverlay}>
        {[...Array(20)].map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: i * (width / 10) }]} />
        ))}
        {[...Array(40)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: i * (height / 20) }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.6,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
  },
  gridLineV: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1,
    backgroundColor: '#fff',
  },
  gridLineH: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: '#fff',
  }
});
