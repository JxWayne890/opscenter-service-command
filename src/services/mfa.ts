/**
 * Multi-Factor Authentication (MFA) service using Supabase TOTP.
 *
 * Supabase supports TOTP-based MFA natively. This service wraps the
 * enrollment and verification flows for use in the Settings view.
 *
 * Prerequisites:
 *   - MFA must be enabled in your Supabase project dashboard
 *     (Authentication > Multi Factor Authentication > Enable TOTP)
 */

import { supabase } from './supabase';

export const MFAService = {
  /**
   * Starts TOTP enrollment. Returns a QR code URI and secret for the user
   * to scan with their authenticator app.
   */
  async enroll(): Promise<{ id: string; qrCode: string; secret: string; error: string | null }> {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'OpsCenter Authenticator',
    });

    if (error || !data) {
      return { id: '', qrCode: '', secret: '', error: error?.message || 'Failed to start enrollment' };
    }

    return {
      id: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      error: null,
    };
  },

  /**
   * Verifies the TOTP code during enrollment to confirm the factor.
   */
  async verifyEnrollment(factorId: string, code: string): Promise<{ success: boolean; error: string | null }> {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challenge) {
      return { success: false, error: challengeError?.message || 'Failed to create challenge' };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      return { success: false, error: verifyError.message };
    }

    return { success: true, error: null };
  },

  /**
   * Verifies a TOTP code during sign-in (after password authentication).
   */
  async verifySignIn(factorId: string, code: string): Promise<{ success: boolean; error: string | null }> {
    return this.verifyEnrollment(factorId, code);
  },

  /**
   * Lists the user's enrolled MFA factors.
   */
  async listFactors(): Promise<{ factors: Array<{ id: string; type: string; status: string }>; error: string | null }> {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      return { factors: [], error: error.message };
    }

    return {
      factors: (data?.totp || []).map(f => ({
        id: f.id,
        type: f.factor_type,
        status: f.status,
      })),
      error: null,
    };
  },

  /**
   * Unenrolls (removes) a TOTP factor.
   */
  async unenroll(factorId: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  },

  /**
   * Checks if the current user has any verified TOTP factors.
   */
  async hasVerifiedFactor(): Promise<boolean> {
    const { factors } = await this.listFactors();
    return factors.some(f => f.status === 'verified');
  },
};
