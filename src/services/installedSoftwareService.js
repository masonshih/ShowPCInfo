import { supabase } from '../supabaseClient';

/**
 * 根據 PC ID 獲取已安裝的軟體列表
 * @param {number} pcinfoId - PC 的 ID (對應 pcinfo.id)
 */
export const getInstalledSoftwareByPCId = async (pcinfoId) => {
    try {
        const { data, error } = await supabase
            .from('installed_software')
            .select('*')
            .eq('pcinfo_id', pcinfoId)
            .order('software_name', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching installed software:', error);
        return { data: null, error };
    }
};

/**
 * 獲取所有已安裝的軟體記錄
 */
export const getAllInstalledSoftware = async () => {
    try {
        const { data, error } = await supabase
            .from('installed_software')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching all installed software:', error);
        return { data: null, error };
    }
};
