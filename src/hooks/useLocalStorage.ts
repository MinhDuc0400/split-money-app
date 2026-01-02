import { useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
    // Get from local storage then parse it
    const readValue = (): T => {
        if (typeof window === "undefined") {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    };

    const [storedValue, setStoredValue] = useState<T>(readValue);

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;

            setStoredValue(valueToStore);

            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key “${key}”:`, error);
        }
    };

    // Re-read value when key changes
    const [prevKey, setPrevKey] = useState(key);
    if (key !== prevKey) {
        setPrevKey(key);
        setStoredValue(readValue());
    }

    return [storedValue, setValue] as const;
}
