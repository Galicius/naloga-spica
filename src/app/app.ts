import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

interface TokenResponse {
  access_token: string;
}

interface User {
  Id: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Email?: string;
}

interface NewUser {
  firstName: string;
  lastName: string;
  email: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  title = 'Naloga Spica';
  settingsOpen = false;
  clientId = '';
  clientSecret = '';
  search = '';
  users: User[] = [];
  newUser: NewUser = {
    firstName: '',
    lastName: '',
    email: '',
  };
  loading = false;
  adding = false;
  error = '';
  message = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.clientId = localStorage.getItem('clientId') || '';
    this.clientSecret = localStorage.getItem('clientSecret') || '';
  }

  get filteredUsers(): User[] {
    const term = this.search.trim().toLowerCase();

    if (!term) {
      return this.users;
    }

    return this.users.filter((user) =>
      [user.FirstName, user.LastName, user.FullName, user.Email].some((value) => value?.toLowerCase().includes(term)),
    );
  }

  openSettings(): void {
    this.settingsOpen = true;
  }

  closeSettings(): void {
    this.settingsOpen = false;
  }

  saveSettings(): void {
    localStorage.setItem('clientId', this.clientId.trim());
    localStorage.setItem('clientSecret', this.clientSecret.trim());
    this.settingsOpen = false;
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.message = '';

    try {
      this.saveSettings();
      const token = await this.getToken();
      const response = await firstValueFrom(
        this.http.get<User[] | { Items?: User[]; items?: User[] }>('/api/v1/Users', {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      );

      this.users = Array.isArray(response) ? response : response.Items || response.items || [];
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Users could not be loaded.';
    } finally {
      this.loading = false;
    }
  }

  async addUser(form: NgForm): Promise<void> {
    this.error = '';
    this.message = '';

    const firstName = this.newUser.firstName.trim();
    const lastName = this.newUser.lastName.trim();
    const email = this.newUser.email.trim();

    if (!firstName || !lastName || !email) {
      this.error = 'Name, surname and mail are required.';
      return;
    }

    if (form.invalid || !this.isValidEmail(email)) {
      this.error = 'Mail must be in a valid email format.';
      return;
    }

    this.adding = true;

    try {
      this.saveSettings();
      const token = await this.getToken();
      const createdUser = await firstValueFrom(
        this.http.post<User | null>(
          '/api/v1/Users',
          {
            FirstName: firstName,
            LastName: lastName,
            Email: email,
          },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      );

      this.users = [
        ...this.users,
        createdUser || {
          Id: email,
          FirstName: firstName,
          LastName: lastName,
          Email: email,
        },
      ];
      form.resetForm({
        firstName: '',
        lastName: '',
        email: '',
      });
      this.message = 'Employee was added.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Employee could not be added.';
    } finally {
      this.adding = false;
    }
  }

  private async getToken(): Promise<string> {
    const body = new HttpParams()
      .set('grant_type', 'client_credentials')
      .set('client_id', this.clientId.trim())
      .set('client_secret', this.clientSecret.trim())
      .set('scope', 'api');

    const response = await firstValueFrom(
      this.http.post<TokenResponse>('/connect/token', body.toString(), {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      }),
    );

    return response.access_token;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
