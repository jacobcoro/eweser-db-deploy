import { backendSupabase } from '../../services/database/supabase/backend-client-init';

export async function getSessionUser() {
  const supabase = await backendSupabase();

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { error };
  }
  if (!data.user) {
    return { error: new Error('Could not find user') };
  }
  return { user: data.user };
}
