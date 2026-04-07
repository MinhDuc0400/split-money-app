import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createMigrate, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage
import groupReducer from './slices/groupSlice';
import financeReducer from './slices/financeSlice';
import authReducer from './slices/authSlice';
import { logout } from './slices/authSlice';
import { registerUnauthorizedHandler } from '../lib/api';

const rootReducer = combineReducers({
    groups: groupReducer,
    finance: financeReducer,
    auth: authReducer,
});

const migrations = {};

const persistConfig = {
    key: 'root',
    storage,
    version: 1,
    migrate: createMigrate(migrations, { debug: false }),
    blacklist: ['groups', 'finance'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});

registerUnauthorizedHandler(() => {
    store.dispatch(logout());
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
