import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidenav } from './sidenav';

describe('Sidenav', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidenav],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Sidenav);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
