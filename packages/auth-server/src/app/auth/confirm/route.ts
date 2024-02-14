import { backendSupabase } from '@/services/database/supabase/backend-client-init';
import { handleServerErrorRedirect } from '@/shared/utils';
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/home';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');

  if (!token_hash || !type) {
    return handleServerErrorRedirect(
      new Error('Invalid token_hash or type'),
      redirectTo
    );
  }
  const supabase = backendSupabase();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });
  if (error) {
    return handleServerErrorRedirect(error, redirectTo);
  }
  redirectTo.searchParams.delete('next');
  return NextResponse.redirect(redirectTo);
}
