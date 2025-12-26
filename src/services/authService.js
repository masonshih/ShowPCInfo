import { supabase } from '../supabaseClient';

/**
 * 使用者登入
 * @param {string} email - 使用者 email
 * @param {string} password - 使用者密碼
 * @returns {Promise<{data, error}>}
 */
export const signIn = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * 使用者登出
 * @returns {Promise<{error}>}
 */
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        return { error };
    } catch (error) {
        return { error };
    }
};

/**
 * 取得當前使用者
 * @returns {Promise<{data, error}>}
 */
export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { data: user, error };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * 取得當前 Session
 * @returns {Promise<{data, error}>}
 */
export const getSession = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { data: session, error };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * 監聽認證狀態變化
 * @param {Function} callback - 狀態變化時的回調函數
 * @returns {Object} subscription - 訂閱物件,可用於取消訂閱
 */
export const onAuthStateChange = (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
};
