import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
}

interface TokenPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'token';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { username, password })
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            this.setToken(response.token);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = this.decodeToken(token);
      if (!payload) return false;
      
      // Check if token is expired (with 60 second buffer)
      return payload.exp * 1000 > Date.now() + 60000;
    } catch {
      return false;
    }
  }

  getTokenExpirationTime(): Date | null {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const payload = this.decodeToken(token);
      return payload ? new Date(payload.exp * 1000) : null;
    } catch {
      return null;
    }
  }

  private decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  }

  verify(): Observable<{ success: boolean; valid: boolean }> {
    return this.http.get<{ success: boolean; valid: boolean }>('/api/auth/verify');
  }
}
