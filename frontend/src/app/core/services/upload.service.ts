import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models';

export interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  mimetype: string;
}

export interface BackgroundFile {
  filename: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  createdAt: string;
}

export interface UploadProgress {
  state: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  file?: UploadedFile;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly apiUrl = '/api/uploads';

  constructor(private http: HttpClient) {}

  uploadBackground(file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<UploadedFile>>(
      `${this.apiUrl}/background`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: HttpEvent<ApiResponse<UploadedFile>>): UploadProgress => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progressEvent = event as HttpProgressEvent;
            const progress = progressEvent.total
              ? Math.round((100 * progressEvent.loaded) / progressEvent.total)
              : 0;
            return { state: 'uploading', progress };

          case HttpEventType.Response:
            const response = event as HttpResponse<ApiResponse<UploadedFile>>;
            if (response.body?.success && response.body.data) {
              return { state: 'done', progress: 100, file: response.body.data };
            }
            return { state: 'error', progress: 0, error: response.body?.message || 'Upload failed' };

          default:
            return { state: 'pending', progress: 0 };
        }
      })
    );
  }

  listBackgrounds(): Observable<ApiResponse<BackgroundFile[]>> {
    return this.http.get<ApiResponse<BackgroundFile[]>>(`${this.apiUrl}/backgrounds`);
  }

  deleteBackground(filename: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/background/${filename}`);
  }
}
