import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, getDocs, query, collection, where, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  schoolActive: boolean;
  maintenanceMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  schoolActive: false,
  maintenanceMode: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolActive, setSchoolActive] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    // Listen to system config
    const configUnsub = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setMaintenanceMode(snap.data().maintenanceMode ?? false);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          let profileDoc = await getDoc(userDocRef);

          if (!profileDoc.exists() && authUser.email) {
            console.log("Profile not found, checking for invites...");
            const isSuperOwner = authUser.email === 'enjoyvibecode@gmail.com';
            
            try {
              const inviteQuery = query(collection(db, 'users'), where('inviteEmail', '==', authUser.email));
              const inviteSnap = await getDocs(inviteQuery);
              
              if (!inviteSnap.empty) {
                console.log("Invite found, claiming...");
                const inviteDoc = inviteSnap.docs[0];
                const inviteData = inviteDoc.data();
                
                // Use UID as document ID for the final profile
                await setDoc(userDocRef, { 
                  ...inviteData, 
                  email: authUser.email,
                  inviteEmail: null, 
                  status: 'active',
                  id: authUser.uid 
                }, { merge: true });
                
                // Remove the invitation document
                await deleteDoc(inviteDoc.ref);
                profileDoc = await getDoc(userDocRef);
                console.log("Invite claimed successfully!");
              } else if (isSuperOwner) {
                // Auto-create profile for Super Owner
                const superProfile = {
                  id: authUser.uid,
                  uid: authUser.uid,
                  username: 'superowner',
                  fullName: 'Super Owner',
                  role: 'owner',
                  status: 'active',
                  schoolId: ''
                };
                await setDoc(userDocRef, superProfile);
                profileDoc = await getDoc(userDocRef);
                console.log("Super Owner profile created!");
              }
            } catch (err) {
              console.error("Error during invite claim:", err);
            }
          }

          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            setProfile(data);

            const isSuperOwner = authUser.email === 'enjoyvibecode@gmail.com';

            // Check if school is active
            if (data.role === 'owner' || data.role === 'kepala_sekolah' || isSuperOwner) {
              setSchoolActive(true);
            } else if (data.schoolId) {
              const schoolDoc = await getDoc(doc(db, 'schools', data.schoolId));
              if (schoolDoc.exists()) {
                setSchoolActive(schoolDoc.data().status === 'active');
              }
            } else {
              setSchoolActive(false);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setProfile(null);
        setSchoolActive(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      configUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, schoolActive, maintenanceMode }}>
      {children}
    </AuthContext.Provider>
  );
};
