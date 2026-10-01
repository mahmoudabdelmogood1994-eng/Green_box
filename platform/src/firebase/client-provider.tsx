'use client';

import React, { useEffect, useMemo, type ReactNode } from 'react';
import { FirebaseProvider, useAuth, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Ensures every visitor has at least an anonymous Firebase Auth session.
 *
 * Added so that Firestore rules can require `request.auth != null` on
 * sensitive collections (orders, failure predictions, critical alerts)
 * without breaking the public demo -- anonymous auth gives every browser
 * session a stable uid with zero login friction, which is what the
 * tightened firestore.rules in this revision assume is in place.
 */
function EnsureAnonymousAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  return <>{children}</>;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <EnsureAnonymousAuth>{children}</EnsureAnonymousAuth>
    </FirebaseProvider>
  );
}