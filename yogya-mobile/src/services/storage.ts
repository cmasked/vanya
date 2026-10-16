import AsyncStorage from '@react-native-async-storage/async-storage';
import {createScopedStorage} from './scopedStorage.js';

// Guest onboarding is a separate device draft. It is never silently assigned
// to a newly connected account. Account records use an origin hash and account ID.
export const storageService = createScopedStorage(AsyncStorage);
