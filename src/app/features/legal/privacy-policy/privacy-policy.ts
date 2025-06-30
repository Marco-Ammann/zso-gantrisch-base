// src/app/features/legal/privacy-policy/privacy-policy.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'zso-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-4">Datenschutzerklärung</h1>
        <p class="text-gray-300">
          Letzte Aktualisierung: {{ lastUpdated | date:'dd. MMMM yyyy':'':'de' }}
        </p>
      </div>

      <div class="space-y-8">
        <!-- 1. Allgemeine Hinweise -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">1. Allgemeine Hinweise</h2>
          <div class="space-y-4 text-gray-300">
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten 
              passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie 
              persönlich identifiziert werden können.
            </p>
            <p>
              Diese Datenschutzerklärung orientiert sich am schweizerischen Datenschutzgesetz (DSG) sowie der 
              EU-Datenschutz-Grundverordnung (DSGVO), soweit sie auf schweizerische Verhältnisse anwendbar ist.
            </p>
          </div>
        </section>

        <!-- 2. Verantwortliche Stelle -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">2. Verantwortliche Stelle</h2>
          <div class="space-y-4 text-gray-300">
            <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
            <div class="bg-gray-800/50 p-4 rounded-lg">
              <p class="font-semibold text-white">Zivilschutzorganisation Gantrisch</p>
              <p>Bernstrasse 8</p>
              <p>3150 Schwarzenburg</p>
              <p>Schweiz</p>
              <p class="mt-2">
                <strong>E-Mail:</strong> 
                <a href="mailto:zso-gantrisch@schwarzenburg.ch" class="text-cp-orange hover:text-cp-orange/80">
                  zso-gantrisch&#64;schwarzenburg.ch
                </a>
              </p>
            </div>
            <p>
              Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen 
              über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet.
            </p>
          </div>
        </section>

        <!-- 3. Datenerfassung -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">3. Datenerfassung auf dieser Website</h2>
          
          <h3 class="text-lg font-medium text-white mb-3">Cookies</h3>
          <div class="space-y-4 text-gray-300 mb-6">
            <p>
              Diese Website verwendet Cookies. Das sind kleine Textdateien, die Ihr Webbrowser auf Ihrem Endgerät 
              speichert. Cookies richten auf Ihrem Endgerät keinen Schaden an und enthalten keine Viren.
            </p>
            <p>
              Einige Cookies sind "Session-Cookies". Solche Cookies werden nach Ende Ihrer Browser-Sitzung von 
              selbst gelöscht. Andere Cookies bleiben auf Ihrem Endgerät gespeichert bis Sie diese löschen.
            </p>
          </div>

          <h3 class="text-lg font-medium text-white mb-3">Server-Log-Dateien</h3>
          <div class="space-y-4 text-gray-300 mb-6">
            <p>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, 
              die Ihr Browser automatisch an uns übermittelt. Dies sind:
            </p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Browsertyp und Browserversion</li>
              <li>verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
            </ul>
            <p>
              Diese Daten sind nicht bestimmten Personen zuordenbar und werden nicht mit anderen Datenquellen 
              zusammengeführt. Wir behalten uns vor, diese Daten nachträglich zu prüfen, wenn uns konkrete 
              Anhaltspunkte für eine rechtswidrige Nutzung bekannt werden.
            </p>
          </div>

          <h3 class="text-lg font-medium text-white mb-3">Kontaktformular und E-Mail-Kontakt</h3>
          <div class="space-y-4 text-gray-300">
            <p>
              Wenn Sie uns per Kontaktformular oder E-Mail Anfragen zukommen lassen, werden Ihre Angaben aus dem 
              Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage 
              und für den Fall von Anschlussfragen bei uns gespeichert.
            </p>
          </div>
        </section>

        <!-- 4. Registrierung und Benutzerkonto -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">4. Registrierung und Benutzerkonto</h2>
          <div class="space-y-4 text-gray-300">
            <p>
              Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen zu nutzen. Die dazu 
              eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des jeweiligen Angebotes oder Dienstes, 
              für den Sie sich registriert haben.
            </p>
            <p>
              Bei der Registrierung werden folgende Daten erhoben:
            </p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Vor- und Nachname</li>
              <li>E-Mail-Adresse</li>
              <li>Telefonnummer (optional)</li>
              <li>Geburtsdatum (optional)</li>
              <li>Profilbild (optional)</li>
            </ul>
            <p>
              Die bei der Registrierung abgefragten Pflichtangaben müssen vollständig angegeben werden. 
              Anderenfalls werden wir die Registrierung ablehnen.
            </p>
          </div>
        </section>

        <!-- 5. Firebase Services -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">5. Firebase Services (Google)</h2>
          <div class="space-y-4 text-gray-300">
            <p>
              Diese Website nutzt Firebase, einen Dienst der Google Ireland Limited ("Google"), Gordon House, 
              Barrow Street, Dublin 4, Irland.
            </p>
            <p>
              Firebase wird für folgende Zwecke eingesetzt:
            </p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Benutzerauthentifizierung</li>
              <li>Datenspeicherung (Firestore Database)</li>
              <li>Dateispeicherung (Cloud Storage)</li>
              <li>Website-Hosting</li>
            </ul>
            <p>
              Die Datenübertragung in die USA wird auf die Standardvertragsklauseln der Europäischen Kommission gestützt. 
              Details finden Sie hier: 
              <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener" 
                 class="text-cp-orange hover:text-cp-orange/80">
                https://firebase.google.com/support/privacy
              </a>
            </p>
          </div>
        </section>

        <!-- 6. Ihre Rechte -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">6. Ihre Rechte</h2>
          <div class="space-y-4 text-gray-300">
            <p>Sie haben jederzeit das Recht:</p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li>unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten</li>
              <li>Berichtigung oder Löschung dieser Daten zu verlangen</li>
              <li>Einschränkung der Datenverarbeitung zu verlangen</li>
              <li>der Datenverarbeitung zu widersprechen</li>
              <li>Datenübertragbarkeit zu verlangen</li>
            </ul>
            <p>
              Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer 
              personenbezogenen Daten durch uns zu beschweren.
            </p>
            <p>
              <strong>Zuständige Aufsichtsbehörde in der Schweiz:</strong><br>
              Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragte (EDÖB)<br>
              Feldeggweg 1<br>
              3003 Bern<br>
              <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener" 
                 class="text-cp-orange hover:text-cp-orange/80">
                www.edoeb.admin.ch
              </a>
            </p>
          </div>
        </section>

        <!-- 7. Löschung von Daten -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">7. Löschung von Daten</h2>
          <div class="space-y-4 text-gray-300">
            <p>
              Die von uns verarbeiteten Daten werden nach Maßgabe der gesetzlichen Vorgaben gelöscht, sobald deren 
              zur Verarbeitung erlaubten Einwilligungen widerrufen werden oder sonstige Erlaubnisse entfallen.
            </p>
            <p>
              Sofern die Daten nicht gelöscht werden, weil sie für andere und gesetzlich zulässige Zwecke erforderlich 
              sind, wird deren Verarbeitung auf diese Zwecke beschränkt.
            </p>
          </div>
        </section>

        <!-- 8. SSL-Verschlüsselung -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">8. SSL- bzw. TLS-Verschlüsselung</h2>
          <div class="space-y-4 text-gray-300">
            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine 
              SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile 
              des Browsers von "http://" auf "https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
            </p>
            <p>
              Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns übermitteln, 
              nicht von Dritten mitgelesen werden.
            </p>
          </div>
        </section>

        <!-- Navigation -->
        <div class="flex justify-between items-center pt-8 border-t border-gray-700">
          <a routerLink="/" class="text-cp-orange hover:text-cp-orange/80 flex items-center gap-2">
            <span class="material-symbols-outlined">arrow_back</span>
            Zurück zur Startseite
          </a>
          <a routerLink="/impressum" class="text-cp-orange hover:text-cp-orange/80">
            Impressum
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class PrivacyPolicyPage {
  readonly lastUpdated = new Date('2025-01-20');
}