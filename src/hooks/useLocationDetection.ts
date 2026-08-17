import { useState } from 'react';
import * as Location from 'expo-location';

import { detectCurrentAddress, type ResolvedAddress } from '@/lib/reverseGeocode';

type Copy = {
  permissionTitle: string;
  permissionBody: string;
  permissionAllow: string;
  permissionDeny: string;
  detectFailed: string;
};

// Shared by consumer-location.tsx and farm-location.tsx — same
// permission-rationale-then-detect-then-reverse-geocode mechanics, just
// different copy and (in the caller) a different table to write the result
// to. Rationale shown before the OS permission prompt, per build spec
// section 7.7 — denial must not be a dead end, so manual entry stays
// available regardless of what the user picks here.
//
// The rationale itself is a ConfirmDialog (see src/components/ui/), not
// Alert.alert — this hook only tracks whether that dialog is open; the
// caller screen renders <ConfirmDialog visible={permissionDialogVisible} .../>
// wired to confirmPermission/dismissPermission below.
export function useLocationDetection(copy: Copy) {
  const [addressLine, setAddressLine] = useState('');
  const [detected, setDetected] = useState<ResolvedAddress | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDialogVisible, setPermissionDialogVisible] = useState(false);

  const requestDetection = async () => {
    setError(null);
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(copy.detectFailed);
        return;
      }
      const result = await detectCurrentAddress();
      if (!result) {
        setError(copy.detectFailed);
        return;
      }
      setDetected(result);
      setAddressLine(result.addressLine);
    } catch {
      setError(copy.detectFailed);
    } finally {
      setDetecting(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setPermissionDialogVisible(true);
  };

  const confirmPermission = () => {
    setPermissionDialogVisible(false);
    requestDetection();
  };

  const dismissPermission = () => {
    setPermissionDialogVisible(false);
  };

  const handleAddressChange = (text: string) => {
    setAddressLine(text);
    setDetected(null);
  };

  return {
    addressLine,
    detected,
    detecting,
    error,
    setError,
    handleUseCurrentLocation,
    handleAddressChange,
    permissionDialogVisible,
    confirmPermission,
    dismissPermission,
  };
}
