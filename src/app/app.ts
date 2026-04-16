import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

interface AbsenceDefinition {
  Id: string;
  Name: string;
  IsActive: boolean;
}

interface Absence {
  Id: string;
  UserId: string;
  FirstName?: string;
  LastName?: string;
  AbsenceDefinitionId: string;
  AbsenceDefinitionName: string;
  Timestamp?: string;
  PartialTimeFrom?: string;
  PartialTimeTo?: string;
  IsPartial?: boolean;
  Comment?: string | null;
}

interface NewAbsence {
  absenceDefinitionId: string;
  start: string;
  end: string;
  comment: string;
}

type ViewMode = 'users' | 'absences';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  title = 'Naloga Špica';
  settingsOpen = false;
  clientId = '';
  clientSecret = '';
  search = '';
  users: User[] = [];
  absences: Absence[] = [];
  absenceDefinitions: AbsenceDefinition[] = [];
  viewMode: ViewMode = 'users';
  selectedDateTime = this.toDateTimeInputValue(new Date());
  absenceModalOpen = false;
  selectedAbsenceUser: User | null = null;
  newAbsence: NewAbsence = this.createEmptyAbsence();
  newUser: NewUser = {
    firstName: '',
    lastName: '',
    email: '',
  };
  loading = false;
  loadingAbsences = false;
  loadingDefinitions = false;
  adding = false;
  savingAbsence = false;
  error = '';
  message = '';

  constructor(
    private readonly http: HttpClient,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

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

  get activeAbsenceDefinitions(): AbsenceDefinition[] {
    return this.absenceDefinitions.filter((definition) => definition.IsActive);
  }

  get selectedMomentLabel(): string {
    return this.formatDateTime(this.selectedDateTime);
  }

  get absencesAtSelectedTime(): Absence[] {
    const selectedTime = this.parseInputDate(this.selectedDateTime)?.getTime();

    if (selectedTime === undefined) {
      return [];
    }

    return this.absences.filter((absence) => {
      const period = this.getAbsencePeriod(absence);
      return Boolean(period && selectedTime >= period.start.getTime() && selectedTime <= period.end.getTime());
    });
  }

  get filteredAbsencesAtSelectedTime(): Absence[] {
    const term = this.search.trim().toLowerCase();

    if (!term) {
      return this.absencesAtSelectedTime;
    }

    return this.absencesAtSelectedTime.filter((absence) =>
      [this.absenceUserName(absence), this.absenceDefinitionName(absence), absence.Comment || ''].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }

  openSettings(): void {
    this.settingsOpen = true;
  }

  closeSettings(): void {
    this.settingsOpen = false;
  }

  async saveSettings(): Promise<void> {
    this.persistSettings();
    this.settingsOpen = false;
    await this.loadUsers();
    await this.loadAbsenceDefinitions();
    await this.loadAbsences();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.message = '';

    try {
      const token = await this.getToken();
      const response = await firstValueFrom(
        this.http.get<User[] | { Items?: User[]; items?: User[] }>('/api/v1/Users', {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      );

      this.users = Array.isArray(response) ? response : response.Items || response.items || [];
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Uporabnikov ni bilo mogoče naložiti.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  async setViewMode(mode: ViewMode): Promise<void> {
    this.viewMode = mode;
    this.error = '';
    this.message = '';

    if (mode === 'users') {
      return;
    }

    if (!this.users.length) {
      await this.loadUsers();
    }

    if (!this.absenceDefinitions.length) {
      await this.loadAbsenceDefinitions();
    }

    if (!this.absences.length) {
      await this.loadAbsences();
    }
  }

  async loadAbsenceDefinitions(): Promise<void> {
    this.loadingDefinitions = true;
    this.error = '';

    try {
      const token = await this.getToken();
      const response = await firstValueFrom(
        this.http.get<AbsenceDefinition[] | { Items?: AbsenceDefinition[]; items?: AbsenceDefinition[] }>(
          '/api/v1/AbsenceDefinitions',
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      );

      this.absenceDefinitions = Array.isArray(response) ? response : response.Items || response.items || [];
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Vrst odsotnosti ni bilo mogoče naložiti.';
    } finally {
      this.loadingDefinitions = false;
      this.changeDetector.detectChanges();
    }
  }

  async loadAbsences(): Promise<void> {
    this.loadingAbsences = true;
    this.error = '';

    try {
      const token = await this.getToken();
      const response = await firstValueFrom(
        this.http.get<Absence[] | { Items?: Absence[]; items?: Absence[] }>('/api/v1/Absences', {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      );

      this.absences = Array.isArray(response) ? response : response.Items || response.items || [];
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Odsotnosti ni bilo mogoče naložiti.';
    } finally {
      this.loadingAbsences = false;
      this.changeDetector.detectChanges();
    }
  }

  async addUser(form: NgForm): Promise<void> {
    this.error = '';
    this.message = '';

    const firstName = this.newUser.firstName.trim();
    const lastName = this.newUser.lastName.trim();
    const email = this.newUser.email.trim();

    if (!firstName || !lastName || !email) {
      this.error = 'Ime, priimek in e-pošta so obvezni.';
      return;
    }

    if (form.invalid || !this.isValidEmail(email)) {
      this.error = 'E-pošta mora biti v veljavnem formatu.';
      return;
    }

    this.adding = true;

    try {
      this.persistSettings();
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
      this.message = 'Zaposleni je bil dodan.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Zaposlenega ni bilo mogoče dodati.';
    } finally {
      this.adding = false;
      this.changeDetector.detectChanges();
    }
  }

  async openAbsenceDialog(user: User): Promise<void> {
    this.selectedAbsenceUser = user;
    this.newAbsence = this.createEmptyAbsence();
    this.absenceModalOpen = true;
    this.error = '';
    this.message = '';

    if (!this.absenceDefinitions.length) {
      await this.loadAbsenceDefinitions();
    }
  }

  closeAbsenceDialog(): void {
    this.absenceModalOpen = false;
    this.selectedAbsenceUser = null;
    this.newAbsence = this.createEmptyAbsence();
  }

  async saveAbsence(form: NgForm): Promise<void> {
    this.error = '';
    this.message = '';

    if (!this.selectedAbsenceUser) {
      this.error = 'Najprej izberi zaposlenega.';
      return;
    }

    const start = this.parseInputDate(this.newAbsence.start);
    const end = this.parseInputDate(this.newAbsence.end);

    if (form.invalid || !this.newAbsence.absenceDefinitionId || !start || !end) {
      this.error = 'Vrsta odsotnosti, začetek in konec so obvezni.';
      return;
    }

    if (end.getTime() <= start.getTime()) {
      this.error = 'Konec mora biti poznejši od začetka.';
      return;
    }

    this.savingAbsence = true;

    try {
      this.persistSettings();
      const token = await this.getToken();
      const definition = this.absenceDefinitions.find((item) => item.Id === this.newAbsence.absenceDefinitionId);
      const payload = {
        UserId: this.selectedAbsenceUser.Id,
        AbsenceDefinitionId: this.newAbsence.absenceDefinitionId,
        AbsenceDefinitionName: definition?.Name,
        Timestamp: start.toISOString(),
        PartialTimeFrom: start.toISOString(),
        PartialTimeTo: end.toISOString(),
        IsPartial: true,
        Comment: this.newAbsence.comment.trim() || null,
      };

      const createdAbsence = await firstValueFrom(
        this.http.post<Absence | null>('/api/v1/Absences', payload, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      );

      this.absences = [
        createdAbsence || {
          Id: `${this.selectedAbsenceUser.Id}-${start.toISOString()}`,
          UserId: this.selectedAbsenceUser.Id,
          FirstName: this.selectedAbsenceUser.FirstName,
          LastName: this.selectedAbsenceUser.LastName,
          AbsenceDefinitionId: this.newAbsence.absenceDefinitionId,
          AbsenceDefinitionName: definition?.Name || 'Odsotnost',
          Timestamp: start.toISOString(),
          PartialTimeFrom: start.toISOString(),
          PartialTimeTo: end.toISOString(),
          IsPartial: true,
          Comment: this.newAbsence.comment.trim() || null,
        },
        ...this.absences,
      ];
      this.message = 'Odsotnost je bila shranjena.';
      this.closeAbsenceDialog();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Odsotnosti ni bilo mogoče shraniti.';
    } finally {
      this.savingAbsence = false;
      this.changeDetector.detectChanges();
    }
  }

  userDisplayName(user: User): string {
    const fullName = [user.FirstName, user.LastName].filter(Boolean).join(' ').trim();
    return user.FullName || fullName || user.Email || user.Id;
  }

  absenceUserName(absence: Absence): string {
    const matchedUser = this.users.find((user) => user.Id === absence.UserId);
    const fullName = [absence.FirstName, absence.LastName].filter(Boolean).join(' ').trim();
    return matchedUser ? this.userDisplayName(matchedUser) : fullName || absence.UserId;
  }

  absenceDefinitionName(absence: Absence): string {
    return this.absenceDefinitions.find((definition) => definition.Id === absence.AbsenceDefinitionId)?.Name || '-';
  }

  absencePeriodLabel(absence: Absence): string {
    const period = this.getAbsencePeriod(absence);
    return period
      ? `${this.formatDate(period.start)} ${this.formatTime(period.start)} - ${this.formatDate(period.end)} ${this.formatTime(
          period.end,
        )}`
      : '-';
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

  private persistSettings(): void {
    localStorage.setItem('clientId', this.clientId.trim());
    localStorage.setItem('clientSecret', this.clientSecret.trim());
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private createEmptyAbsence(): NewAbsence {
    const start = this.selectedDateTime || this.toDateTimeInputValue(new Date());
    const startDate = this.parseInputDate(start) || new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    return {
      absenceDefinitionId: '',
      start,
      end: this.toDateTimeInputValue(endDate),
      comment: '',
    };
  }

  private getAbsencePeriod(absence: Absence): { start: Date; end: Date } | null {
    const partialStart = this.parseApiDate(absence.PartialTimeFrom);
    const partialEnd = this.parseApiDate(absence.PartialTimeTo);

    if (partialStart && partialEnd && partialEnd.getTime() > partialStart.getTime()) {
      return { start: partialStart, end: partialEnd };
    }

    const day = this.parseApiDate(absence.Timestamp) || partialStart || partialEnd;

    if (!day) {
      return null;
    }

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private parseInputDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseApiDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateTimeInputValue(date: Date): string {
    const pad = (value: number): string => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
      date.getMinutes(),
    )}`;
  }

  private formatDateTime(value: string): string {
    const date = this.parseInputDate(value);
    return date ? `${this.formatDate(date)} ${this.formatTime(date)}` : '-';
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
