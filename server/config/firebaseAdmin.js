const admin = require('firebase-admin');
require('dotenv').config();

let firebaseAdminInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Supports three methods:
 * 1. Service Account JSON file (FIREBASE_SERVICE_ACCOUNT_FILE env var)
 * 2. Individual Firebase config vars (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
 * 3. Default credentials (via GOOGLE_APPLICATION_CREDENTIALS)
 */
const initializeFirebaseAdmin = () => {
  if (firebaseAdminInitialized) {
    return admin;
  }

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    let credential;
    const initOptions = {
      projectId: projectId
    };

    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      credential = admin.credential.cert(serviceAccount);
    } else if (projectId && privateKey && clientEmail) {
      credential = admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail
      });
    } else {
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      credential,
      ...initOptions
    });

    firebaseAdminInitialized = true;
    return admin;
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
    throw error;
  }
};

/**
 * Get Firebase Auth instance
 */
const getAuth = () => {
  if (!firebaseAdminInitialized) {
    initializeFirebaseAdmin();
  }
  return admin.auth();
};

/**
 * Update user password in Firebase Auth
 */
const updateUserPassword = async (uid, newPassword) => {
  try {
    if (!firebaseAdminInitialized) {
      initializeFirebaseAdmin();
    }

    if (!uid || uid.trim() === '') {
      throw new Error('User UID is required');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const auth = getAuth();
    await auth.updateUser(uid, {
      password: newPassword
    });

    return { success: true, message: 'Password updated in Firebase Auth' };
  } catch (error) {
    console.error('Firebase password update failed:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('Firebase user not found');
    }
    throw error;
  }
};

/**
 * Delete a Firebase Auth user by UID
 */
const deleteUser = async (uid) => {
  try {
    if (!firebaseAdminInitialized) {
      initializeFirebaseAdmin();
    }

    const auth = getAuth();
    await auth.deleteUser(uid);

    return { success: true, message: 'User deleted from Firebase Auth' };
  } catch (error) {
    console.error('Firebase user delete failed:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('Firebase UID does not exist or was already deleted');
    }
    throw error;
  }
};

/**
 * Get user by UID
 */
const getUserByUid = async (uid) => {
  try {
    if (!firebaseAdminInitialized) {
      initializeFirebaseAdmin();
    }
    const auth = getAuth();
    return await auth.getUser(uid);
  } catch (error) {
    console.error('Error getting user from Firebase by UID:', error.message);
    throw error;
  }
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  try {
    if (!firebaseAdminInitialized) {
      initializeFirebaseAdmin();
    }
    const auth = getAuth();
    return await auth.getUserByEmail(email);
  } catch (error) {
    console.error('Error getting user from Firebase by email:', error.message);
    throw error;
  }
};

module.exports = {
  initializeFirebaseAdmin,
  getAuth,
  updateUserPassword,
  deleteUser,
  getUserByUid,
  getUserByEmail
};
