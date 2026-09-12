import { fixtureUser } from './fixtures';
import type { AuthUser, IAuthService } from './IAuthService';

/**
 * Sign-in for the offline demonstration: there is no backend to sign in to.
 *
 * It still goes through `AuthPage` rather than auto-authenticating, so the
 * offline build exercises the same first screen a clinician sees and the sign-in
 * page cannot rot unnoticed. `fabricAuthEnabled` is false, which is what the
 * page reads to label its button honestly instead of promising Microsoft SSO it
 * will not perform.
 */
export class OfflineAuthService implements IAuthService {
  readonly fabricAuthEnabled = false;

  private user: AuthUser | null = null;

  async signIn(): Promise<AuthUser> {
    this.user = fixtureUser;
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  /** No Fabric iframe offline, so there is no embedded session to acquire. */
  async initEmbeddedAuth(): Promise<AuthUser | null> {
    return null;
  }
}
