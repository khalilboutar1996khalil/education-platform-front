import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../shared/directives/reveal.directive';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  readonly menuOpen = signal(false);
  readonly faqOpen = signal<Record<number, boolean>>({ 0: true });

  heroModules = [
    {
      icon: 'M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
      title: 'Algorithmique & programmation',
      meta: '2ᵉ AS · 5 chapitres',
    },
    {
      icon: 'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3z M21 12c0 1.66-4 3-9 3s-9-1.34-9-3 M3 6v12c0 1.66 4 3 9 3s9-1.34 9-3V6',
      title: 'Bases de données',
      meta: '2ᵉ AS · 4 chapitres',
    },
    {
      icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
      title: 'Programmation orientée objet',
      meta: '3ᵉ AS · 6 chapitres',
    },
    {
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      title: 'Sécurité informatique',
      meta: '3ᵉ AS · 4 chapitres',
    },
  ];

  missionStats = [
    {
      icon: 'M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
      value: '12',
      label: "modules d'informatique",
    },
    {
      icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
      value: '70+',
      label: 'leçons et vidéos',
    },
    {
      icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      value: '100%',
      label: 'TP et devoirs corrigés en ligne',
    },
    {
      icon: 'M12 2a10 10 0 1 0 10 10 M12 6v6l4 2',
      value: '24/7',
      label: 'accès aux cours, à votre rythme',
    },
  ];

  services = [
    {
      icon: 'M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
      title: '2ᵉ année secondaire',
      desc: 'Algorithmique, structures de données, bases de données, systèmes, réseaux et développement web — 6 modules complets.',
      tag: '6 modules',
    },
    {
      icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
      title: '3ᵉ année secondaire',
      desc: "Programmation orientée objet, algorithmes avancés, SGBD, architecture, sécurité et projet de fin d'année.",
      tag: '6 modules',
    },
    {
      icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
      title: '4ᵉ année secondaire',
      desc: 'Modules adaptés aux filières lettres et économie & gestion, avec le même suivi de cours, TP et quiz que les autres niveaux.',
      tag: 'Lettres · Éco & gestion',
    },
    {
      icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      title: 'Toutes filières',
      desc: 'Le même contenu pédagogique pour les filières scientifiques, gestion & économie et lettres — un seul parcours pour tous.',
      tag: 'S · Éco · Lettres',
    },
  ];

  reasons = [
    {
      icon: 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
      title: 'Contenu structuré',
      desc: 'Chapitres et leçons organisés, alignés sur le programme officiel.',
    },
    {
      icon: 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
      title: 'Vidéos de cours',
      desc: 'Chaque notion expliquée en vidéo, à revoir à volonté.',
    },
    {
      icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      title: 'Quiz & TP',
      desc: 'Exercices pratiques déposés et corrigés en ligne, avec note.',
    },
    {
      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
      title: 'Suivi individuel',
      desc: 'Progression, notes et retours visibles à tout moment.',
    },
    {
      icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
      title: 'Annonces claires',
      desc: 'Rappels de dates et informations importantes centralisés.',
    },
    {
      icon: 'M12 2a10 10 0 1 0 10 10 M12 6v6l4 2',
      title: 'Toujours accessible',
      desc: "100% en ligne : on apprend depuis chez soi, à son rythme.",
    },
    {
      icon: 'M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
      title: 'Programme officiel',
      desc: "Contenu aligné sur le module d'informatique du secondaire.",
    },
    {
      icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
      title: 'Pensé pour rassurer',
      desc: 'Une interface claire, pas de jargon, pour les parents comme les élèves.',
    },
  ];


  steps = [
    { n: '1', title: 'Découvrir une formation', desc: 'Parcourez les modules de votre niveau et filière.' },
    { n: '2', title: 'Consulter les détails', desc: "Chapitres, vidéos, durée : tout est visible avant de s'inscrire." },
    { n: '3', title: 'Créer un compte', desc: 'Formulaire rapide, aucune carte bancaire requise.' },
    { n: '4', title: "S'inscrire au module", desc: 'Accès immédiat aux modules de votre niveau.' },
    { n: '5', title: 'Commencer les cours', desc: 'Vidéos, chapitres et premiers exercices.' },
    { n: '6', title: 'Suivre sa progression', desc: "Notes, TP corrigés et avancement en un coup d'œil." },
  ];

  parentTestimonials = [
    {
      initials: 'M.B',
      name: 'M. Belkacem',
      text: "Je peux enfin suivre ce que fait mon fils sans être devant l'ordinateur avec lui. La plateforme est très claire.",
    },
    {
      initials: 'S.T',
      name: 'Mme Toumi',
      text: 'Les corrections rapides des TP ont vraiment aidé ma fille à progresser avant les examens.',
    },
  ];

  faqData = [
    {
      q: "Comment m'inscrire à un module ?",
      a: "Cliquez sur « S'inscrire », choisissez votre niveau et créez votre compte : vous accédez immédiatement aux modules de votre niveau.",
    },
    {
      q: 'Les formations sont-elles gratuites ou payantes ?',
      a: "Certains modules sont gratuits, d'autres payants selon le niveau. Le détail des tarifs est communiqué à l'inscription, avant toute confirmation.",
    },
    {
      q: 'Les cours sont-ils en ligne ou en présentiel ?',
      a: 'Toute la plateforme est 100% en ligne : vidéos, chapitres, quiz et dépôt de TP se font depuis chez vous, sans déplacement.',
    },
    {
      q: 'Comment sont corrigés les TP et devoirs ?',
      a: 'Vous déposez votre fichier directement sur la plateforme. Il est corrigé et noté en ligne, avec un commentaire si besoin.',
    },
    {
      q: 'Puis-je suivre ma progression ?',
      a: 'Oui, chaque élève voit sa progression par module, ses notes de quiz et l’état de ses TP déposés.',
    },
    {
      q: 'Le paiement en ligne est-il disponible ?',
      a: "Pas pour le moment. Les modalités de paiement sont communiquées directement après l'inscription.",
    },
  ];

  socials = [
    {
      icon: 'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z',
    },
    { icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
    {
      icon: 'M17.5 6.5h.01 M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z',
    },
    { icon: 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleFaq(i: number): void {
    this.faqOpen.update((open) => ({ ...open, [i]: !open[i] }));
  }
}
