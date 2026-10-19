import { ComponentFixture, TestBed } from '@angular/core/testing';
import Reports from '@pages/reports/reports';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Reports', (): void => {
  let fixture: ComponentFixture<Reports>;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [Reports],
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
  });

  it('muestra la página de informes', (): void => {
    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Informes económicos');
    expect(content).toContain('evolución');
  });
});
