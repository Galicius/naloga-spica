import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render search and users table', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Naloga Špica');
    expect(compiled.querySelector('input[type="search"]')).toBeTruthy();
    expect(compiled.querySelector('table')).toBeTruthy();
  });

  it('should open settings popup', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('header button').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Nastavitve prijave');
    expect(dialog.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('should filter users by name or email', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.users = [
      { Id: '1', FirstName: 'Ana', LastName: 'Novak', Email: 'ana@example.test' },
      { Id: '2', FirstName: 'Bojan', LastName: 'Kovač', Email: 'bojan@example.test' },
    ];
    app.search = 'novak';

    expect(app.filteredUsers).toEqual([{ Id: '1', FirstName: 'Ana', LastName: 'Novak', Email: 'ana@example.test' }]);
  });

  it('should load saved credentials from local storage', () => {
    localStorage.setItem('clientId', 'saved-client');
    localStorage.setItem('clientSecret', 'saved-secret');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance.clientId).toBe('saved-client');
    expect(fixture.componentInstance.clientSecret).toBe('saved-secret');
  });

  it('should expose only active absence definitions', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.absenceDefinitions = [
      { Id: 'vacation', Name: 'Dopust', IsActive: true },
      { Id: 'archived', Name: 'Arhivirana vrsta', IsActive: false },
      { Id: 'sick', Name: 'Bolniska', IsActive: true },
    ];

    expect(app.activeAbsenceDefinitions).toEqual([
      { Id: 'vacation', Name: 'Dopust', IsActive: true },
      { Id: 'sick', Name: 'Bolniska', IsActive: true },
    ]);
  });

  it('should find absences that overlap the selected date and time', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.selectedDateTime = '2026-04-16T10:30';
    app.absences = [
      {
        Id: 'overlap',
        UserId: '1',
        AbsenceDefinitionId: 'vacation',
        AbsenceDefinitionName: 'Dopust',
        PartialTimeFrom: '2026-04-16T08:00:00.000Z',
        PartialTimeTo: '2026-04-16T12:00:00.000Z',
      },
      {
        Id: 'outside',
        UserId: '2',
        AbsenceDefinitionId: 'sick',
        AbsenceDefinitionName: 'Bolniska',
        PartialTimeFrom: '2026-04-16T13:00:00.000Z',
        PartialTimeTo: '2026-04-16T15:00:00.000Z',
      },
      {
        Id: 'day-long',
        UserId: '3',
        AbsenceDefinitionId: 'remote',
        AbsenceDefinitionName: 'Delo od doma',
        Timestamp: '2026-04-16T00:00:00.000Z',
      },
    ];

    expect(app.absencesAtSelectedTime.map((absence) => absence.Id)).toEqual(['overlap', 'day-long']);
  });

  it('should display absence names from absence definitions instead of the absence payload', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const absence = {
      Id: '1',
      UserId: '1',
      AbsenceDefinitionId: 'vacation',
      AbsenceDefinitionName: 'Holiday leave',
    };

    app.absenceDefinitions = [{ Id: 'vacation', Name: 'Letni dopust', IsActive: true }];

    expect(app.absenceDefinitionName(absence)).toBe('Letni dopust');

    app.absenceDefinitions = [];
    expect(app.absenceDefinitionName(absence)).toBe('-');
  });

  it('should filter selected-time absences by employee, definition, or comment', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.selectedDateTime = '2026-04-16T10:30';
    app.users = [{ Id: '1', FirstName: 'Ana', LastName: 'Novak', Email: 'ana@example.test' }];
    app.absenceDefinitions = [
      { Id: 'vacation', Name: 'Letni dopust', IsActive: true },
      { Id: 'sick', Name: 'Bolniska', IsActive: true },
    ];
    app.absences = [
      {
        Id: 'ana',
        UserId: '1',
        AbsenceDefinitionId: 'vacation',
        AbsenceDefinitionName: 'Holiday leave',
        PartialTimeFrom: '2026-04-16T08:00:00.000Z',
        PartialTimeTo: '2026-04-16T12:00:00.000Z',
        Comment: 'Druzinski izlet',
      },
      {
        Id: 'bojan',
        UserId: '2',
        FirstName: 'Bojan',
        LastName: 'Kovac',
        AbsenceDefinitionId: 'sick',
        AbsenceDefinitionName: 'Sick leave',
        PartialTimeFrom: '2026-04-16T08:00:00.000Z',
        PartialTimeTo: '2026-04-16T12:00:00.000Z',
        Comment: null,
      },
    ];

    app.search = 'izlet';
    expect(app.filteredAbsencesAtSelectedTime.map((absence) => absence.Id)).toEqual(['ana']);

    app.search = 'bolni';
    expect(app.filteredAbsencesAtSelectedTime.map((absence) => absence.Id)).toEqual(['bojan']);

    app.search = 'ana novak';
    expect(app.filteredAbsencesAtSelectedTime.map((absence) => absence.Id)).toEqual(['ana']);

    app.search = 'holiday';
    expect(app.filteredAbsencesAtSelectedTime).toEqual([]);
  });

  it('should load absence definitions when opening cached absences', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.users = [{ Id: '1', FirstName: 'Ana', LastName: 'Novak' }];
    app.absences = [
      {
        Id: '1',
        UserId: '1',
        AbsenceDefinitionId: 'vacation',
        AbsenceDefinitionName: 'Holiday leave',
      },
    ];
    const loadDefinitions = vi.spyOn(app, 'loadAbsenceDefinitions').mockResolvedValue();
    const loadAbsences = vi.spyOn(app, 'loadAbsences').mockResolvedValue();

    await app.setViewMode('absences');

    expect(loadDefinitions).toHaveBeenCalledOnce();
    expect(loadAbsences).not.toHaveBeenCalled();
  });

  it('should reject absence dates where the end is not after the start', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.selectedAbsenceUser = { Id: '1', FirstName: 'Ana', LastName: 'Novak' };
    app.newAbsence = {
      absenceDefinitionId: 'vacation',
      start: '2026-04-16T10:00',
      end: '2026-04-16T10:00',
      comment: '',
    };

    await app.saveAbsence({ invalid: false } as any);

    expect(app.error).toContain('Konec mora biti');
    expect(app.savingAbsence).toBe(false);
  });

  it('should post a trimmed user and append the created response', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);

    app.clientId = ' client-id ';
    app.clientSecret = ' client-secret ';
    app.newUser = {
      firstName: ' Ana ',
      lastName: ' Novak ',
      email: ' ana@example.test ',
    };

    const addUserPromise = app.addUser({
      invalid: false,
      resetForm: vi.fn(),
    } as any);

    const tokenRequest = http.expectOne('/connect/token');
    expect(tokenRequest.request.method).toBe('POST');
    expect(tokenRequest.request.body).toContain('client_id=client-id');
    expect(tokenRequest.request.body).toContain('client_secret=client-secret');
    tokenRequest.flush({ access_token: 'token-1' });
    await new Promise((resolve) => setTimeout(resolve));

    const createRequest = http.expectOne('/api/v1/Users');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(createRequest.request.body).toEqual({
      FirstName: 'Ana',
      LastName: 'Novak',
      Email: 'ana@example.test',
    });
    createRequest.flush({ Id: '1', FirstName: 'Ana', LastName: 'Novak', Email: 'ana@example.test' });

    await addUserPromise;

    expect(app.users).toEqual([{ Id: '1', FirstName: 'Ana', LastName: 'Novak', Email: 'ana@example.test' }]);
    expect(app.message).toBe('Zaposleni je bil dodan.');
  });

  it('should save an absence with the selected user and definition', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const resetDetection = vi.spyOn((app as any).changeDetector, 'detectChanges').mockImplementation(() => undefined);

    app.clientId = 'client-id';
    app.clientSecret = 'client-secret';
    app.selectedAbsenceUser = { Id: '1', FirstName: 'Ana', LastName: 'Novak' };
    app.absenceDefinitions = [{ Id: 'vacation', Name: 'Dopust', IsActive: true }];
    app.newAbsence = {
      absenceDefinitionId: 'vacation',
      start: '2026-04-16T08:00',
      end: '2026-04-16T12:00',
      comment: ' Dopoldanski dopust ',
    };

    const savePromise = app.saveAbsence({ invalid: false } as any);

    http.expectOne('/connect/token').flush({ access_token: 'token-1' });
    await new Promise((resolve) => setTimeout(resolve));

    const createRequest = http.expectOne('/api/v1/Absences');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(createRequest.request.body).toMatchObject({
      UserId: '1',
      AbsenceDefinitionId: 'vacation',
      AbsenceDefinitionName: 'Dopust',
      IsPartial: true,
      Comment: 'Dopoldanski dopust',
    });
    createRequest.flush(null);

    await savePromise;

    expect(app.absenceModalOpen).toBe(false);
    expect(app.absences[0]).toMatchObject({
      UserId: '1',
      FirstName: 'Ana',
      LastName: 'Novak',
      AbsenceDefinitionId: 'vacation',
      AbsenceDefinitionName: 'Dopust',
      Comment: 'Dopoldanski dopust',
    });
    expect(app.message).toBe('Odsotnost je bila shranjena.');

    resetDetection.mockRestore();
  });
});
