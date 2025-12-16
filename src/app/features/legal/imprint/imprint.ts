// src/app/features/legal/imprint/imprint.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'zso-imprint',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-4">Impressum</h1>
        <p class="text-gray-300">
          Angaben gemäss Art. 3 Abs. 3 UWG (Bundesgesetz gegen den unlauteren Wettbewerb)
        </p>
      </div>

      <div class="space-y-8">
        <!-- Verantwortlich für den Inhalt -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Verantwortlich für den Inhalt</h2>
          <div class="bg-gray-800/50 p-4 rounded-lg">
            <p class="font-semibold text-white text-lg mb-2">Zivilschutzorganisation Gantrisch</p>
            <div class="space-y-1 text-gray-300">
              <p>Bernstrasse 8</p>
              <p>3150 Schwarzenburg</p>
              <p>Schweiz</p>
            </div>
            
            <div class="mt-4 space-y-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-cp-orange">email</span>
                <a href="mailto:zso-gantrisch@schwarzenburg.ch" 
                   class="text-cp-orange hover:text-cp-orange/80">
                  zso-gantrisch&#64;schwarzenburg.ch
                </a>
              </div>
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-cp-orange">language</span>
                <a href="https://www.zso-gantrisch.ch" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="text-cp-orange hover:text-cp-orange/80">
                  www.zso-gantrisch.ch
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Technische Umsetzung -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Technische Umsetzung</h2>
          <div class="bg-gray-800/50 p-4 rounded-lg">
            <p class="font-semibold text-white text-lg mb-2">Marco Ammann</p>
            <div class="space-y-1 text-gray-300">
              <p>Web-Entwickler</p>
              <p>3148 Lanzenhäusern</p>
              <p>Schweiz</p>
            </div>
            
            <div class="mt-4 space-y-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-cp-orange">email</span>
                <a href="mailto:marco-ammann@outlook.com" 
                   class="text-cp-orange hover:text-cp-orange/80">
                  marco-ammann&#64;outlook.com
                </a>
              </div>
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-cp-orange">language</span>
                <a href="https://www.marco-ammann.ch" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="text-cp-orange hover:text-cp-orange/80">
                  www.marco-ammann.ch
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Haftungsausschluss -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Haftungsausschluss</h2>
          
          <div class="space-y-6 text-gray-300">
            <div>
              <h3 class="text-lg font-medium text-white mb-3">Inhalt des Onlineangebotes</h3>
              <p>
                Der Autor übernimmt keinerlei Gewähr für die Aktualität, Korrektheit, Vollständigkeit oder 
                Qualität der bereitgestellten Informationen. Haftungsansprüche gegen den Autor, welche sich 
                auf Schäden materieller oder ideeller Art beziehen, die durch die Nutzung oder Nichtnutzung 
                der dargebotenen Informationen bzw. durch die Nutzung fehlerhafter und unvollständiger 
                Informationen verursacht wurden, sind grundsätzlich ausgeschlossen.
              </p>
            </div>

            <div>
              <h3 class="text-lg font-medium text-white mb-3">Verweise und Links</h3>
              <p>
                Bei direkten oder indirekten Verweisen auf fremde Webseiten ("Hyperlinks"), die ausserhalb 
                des Verantwortungsbereiches des Autors liegen, würde eine Haftungsverpflichtung ausschliesslich 
                in dem Fall in Kraft treten, in dem der Autor von den Inhalten Kenntnis hat und es ihm technisch 
                möglich und zumutbar wäre, die Nutzung im Falle rechtswidriger Inhalte zu verhindern.
              </p>
            </div>

            <div>
              <h3 class="text-lg font-medium text-white mb-3">Urheber- und Kennzeichenrecht</h3>
              <p>
                Der Autor ist bestrebt, in allen Publikationen die Urheberrechte der verwendeten Grafiken, 
                Tondokumente, Videosequenzen und Texte zu beachten, von ihm selbst erstellte Grafiken, 
                Tondokumente, Videosequenzen und Texte zu nutzen oder auf lizenzfreie Grafiken, Tondokumente, 
                Videosequenzen und Texte zurückzugreifen.
              </p>
            </div>

            <div>
              <h3 class="text-lg font-medium text-white mb-3">Datenschutz</h3>
              <p>
                Sofern innerhalb des Internetangebotes die Möglichkeit zur Eingabe persönlicher oder 
                geschäftlicher Daten besteht, so erfolgt die Preisgabe dieser Daten seitens des Nutzers 
                auf ausdrücklich freiwilliger Basis. Die Inanspruchnahme und Bezahlung aller angebotenen 
                Dienste ist soweit technisch möglich und zumutbar auch ohne Angabe solcher Daten bzw. 
                unter Angabe anonymisierter Daten oder eines Pseudonyms gestattet.
              </p>
            </div>
          </div>
        </section>

        <!-- Rechtswirksamkeit -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Rechtswirksamkeit</h2>
          <div class="text-gray-300">
            <p>
              Dieser Haftungsausschluss ist als Teil des Internetangebotes zu betrachten, von dem aus auf 
              diese Seite verwiesen wurde. Sofern Teile oder einzelne Formulierungen dieses Textes der 
              geltenden Rechtslage nicht, nicht mehr oder nicht vollständig entsprechen sollten, bleiben 
              die übrigen Teile des Dokumentes in ihrem Inhalt und ihrer Gültigkeit davon unberührt.
            </p>
          </div>
        </section>

        <!-- Anwendbares Recht -->
        <section class="glass-card p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Anwendbares Recht und Gerichtsstand</h2>
          <div class="text-gray-300">
            <p>
              Für sämtliche Rechtsverhältnisse der Parteien gilt das Recht der Schweiz unter Ausschluss 
              der Bestimmungen des Internationalen Privatrechts. Gerichtsstand ist Schwarzenburg, Schweiz.
            </p>
          </div>
        </section>

        <!-- Navigation -->
        <div class="flex justify-between items-center pt-8 border-t border-gray-700">
          <a routerLink="/" class="text-cp-orange hover:text-cp-orange/80 flex items-center gap-2">
            <span class="material-symbols-outlined">arrow_back</span>
            Zurück zur Startseite
          </a>
          <a routerLink="/datenschutz" class="text-cp-orange hover:text-cp-orange/80">
            Datenschutzerklärung
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
export class ImprintPage { }