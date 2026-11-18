import { Component, effect, inject, input, signal } from '@angular/core';
import { ForumService } from '../../../core/services/forum.service';
import { authError } from '../../../core/services/auth.service';
import { PdfInfo } from '../../../core/models/api.models';
@Component({selector: 'app-pdf-attachment', standalone: true, templateUrl: './pdf-attachment.component.html', styleUrl: './pdf-attachment.component.css'})
export class PdfAttachmentComponent {
  readonly kind = input.required<'communities' | 'publications'>();
  readonly contentId = input.required<number>();
  readonly writable = input(false);
  readonly pdf = signal<PdfInfo | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly forum = inject(ForumService);
  private version = 0;
  constructor() { effect(() => { const kind = this.kind(), id = this.contentId(); void this.load(kind, id); }); }
  async load(kind: string, id: number) {
    const version = ++this.version;
    this.loading.set(true); this.error.set(''); this.pdf.set(null);
    try { const pdf = await this.forum.pdf(kind, id); if (version === this.version) this.pdf.set(pdf); }
    catch (error) { if (version === this.version) this.error.set(authError(error)); }
    finally { if (version === this.version) this.loading.set(false); }
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    if (!file) return;
    this.busy.set(true); this.error.set('');
    try { this.pdf.set(await this.forum.uploadPdf(this.kind(), this.contentId(), file)); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); input.value = ''; }
  }
  async remove() {
    if (!confirm('Supprimer le PDF joint ?')) return;
    this.busy.set(true); this.error.set('');
    try { await this.forum.deletePdf(this.kind(), this.contentId()); this.pdf.set(null); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
}
