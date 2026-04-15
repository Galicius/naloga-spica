import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
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
    expect(compiled.querySelector('h1')?.textContent).toContain('Naloga Spica');
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
      { Id: '1', FirstName: 'starwars', LastName: 'acolyte', Email: 'sith@sith.sith' },
      { Id: '2', FirstName: 'Bojan', LastName: 'Kovac', Email: 'bojan@example.test' },
    ];
    app.search = 'novak';

    expect(app.filteredUsers).toEqual([{ Id: '1', FirstName: 'Ana', LastName: 'Novak', Email: 'ana@example.test' }]);
  });
});
