import { supabase } from '../supabaseClient';

/**
 * 獲取所有印表機資訊
 */
export const getAllPrinters = async () => {
    try {
        const { data, error } = await supabase
            .from('printers')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching printers:', error);
        return { data: null, error };
    }
};

/**
 * 創建新的印表機
 */
export const createPrinter = async (printerData) => {
    try {
        const { data, error } = await supabase
            .from('printers')
            .insert([printerData])
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating printer:', error);
        return { data: null, error };
    }
};

/**
 * 更新印表機
 */
export const updatePrinter = async (id, printerData) => {
    try {
        const { data, error } = await supabase
            .from('printers')
            .update(printerData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating printer:', error);
        return { data: null, error };
    }
};

/**
 * 刪除印表機 (改為隱藏)
 */
export const deletePrinter = async (id) => {
    try {
        const { error } = await supabase
            .from('printers')
            .update({
                is_hidden: true,
                hidden_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error hiding printer:', error);
        return { error };
    }
};

/**
 * 批次刪除多筆印表機記錄 (改為隱藏)
 */
export const deletePrinters = async (ids) => {
    try {
        const { error } = await supabase
            .from('printers')
            .update({
                is_hidden: true,
                hidden_at: new Date().toISOString()
            })
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error hiding multiple printers:', error);
        return { error };
    }
};

/**
 * 永久刪除印表機 (從資料庫移除)
 */
export const permanentDeletePrinter = async (id) => {
    try {
        const { error } = await supabase
            .from('printers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error permanently deleting printer:', error);
        return { error };
    }
};

/**
 * 批次永久刪除印表機 (從資料庫移除)
 */
export const permanentDeletePrinters = async (ids) => {
    try {
        const { error } = await supabase
            .from('printers')
            .delete()
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error permanently deleting multiple printers:', error);
        return { error };
    }
};

/**
 * 還原隱藏的印表機
 */
export const restorePrinter = async (id) => {
    try {
        const { error } = await supabase
            .from('printers')
            .update({
                is_hidden: false,
                hidden_at: null
            })
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error restoring printer:', error);
        return { error };
    }
};

/**
 * 批次還原印表機
 */
export const restorePrinters = async (ids) => {
    try {
        const { error } = await supabase
            .from('printers')
            .update({
                is_hidden: false,
                hidden_at: null
            })
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error restoring multiple printers:', error);
        return { error };
    }
};

/**
 * 搜尋印表機
 */
export const searchPrinters = async (query) => {
    try {
        if (!query || query.trim() === '') {
            return await getAllPrinters();
        }

        const q = `%${query}%`;
        const { data, error } = await supabase
            .from('printers')
            .select('*')
            .or(`brand.ilike.${q},model.ilike.${q},ip_address.ilike.${q},notes.ilike.${q},notes_ii.ilike.${q},asset_id.ilike.${q}`)
            .order('id', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error searching printers:', error);
        return { data: null, error };
    }
};
