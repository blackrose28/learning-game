import React from 'react';
import { getWorldArea } from '@math-archer/learning-engine';
import { CharacterGraphic } from './CharacterGraphic';
import { CAST_MEMBERS, type CastMember } from './castRoster';
import './CastScreen.css';

export interface CastScreenProps {
  onBackToGame: () => void;
  onOpenArmory: () => void;
}

const PLATE_NUMERALS = ['I', 'II', 'III', 'IV'];
const CAST_BY_ID = new Map(CAST_MEMBERS.map((member) => [member.id, member]));

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const handleJump =
  (id: string) =>
  (event: React.MouseEvent<HTMLAnchorElement>): void => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
    const heading = target.querySelector<HTMLElement>('h2, h3');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };

const CastEntry: React.FC<{ member: CastMember; index: number }> = ({ member, index }) => {
  const area = getWorldArea(member.realmId);
  const nameId = `cast-name-${member.id}`;
  return (
    <article
      id={`cast-${member.id}`}
      className={`cast-entry${index % 2 === 1 ? ' cast-entry--reversed' : ''}`}
      aria-labelledby={nameId}
      style={{ '--cast-hero': area.theme.accentColor } as React.CSSProperties}
    >
      <div className="cast-entry-copy">
        <p className="cast-kicker">
          <span className="cast-kicker-num">{String(index + 1).padStart(2, '0')}</span>
          <span className="cast-kicker-rule" aria-hidden="true" />
          <span>
            {area.icon} {area.name}
          </span>
        </p>
        <h3 id={nameId} className="cast-name">
          {member.name}
        </h3>
        <p className="cast-epithet">{member.epithet}</p>
        <blockquote className="cast-quote">
          <p>“{member.quote}”</p>
        </blockquote>
        <p className="cast-summary">{member.summary}</p>

        <dl className="cast-facts">
          <div className="cast-fact">
            <dt>Origin</dt>
            <dd>{member.origin}</dd>
          </div>
          <div className="cast-fact">
            <dt>Allegiance</dt>
            <dd>{member.allegiance}</dd>
          </div>
          <div className="cast-fact">
            <dt>Defining flaw</dt>
            <dd>{member.flaw}</dd>
          </div>
          <div className="cast-fact">
            <dt>Weapon</dt>
            <dd>
              {member.weapon}
              <span className="cast-affinity"> · {member.element} affinity</span>
            </dd>
          </div>
        </dl>

        <div className="cast-links">
          <h4 className="cast-links-title">Shares a past with</h4>
          <ul className="cast-links-list">
            {member.links.map((link) => {
              const other = CAST_BY_ID.get(link.character);
              if (!other) return null;
              return (
                <li key={link.character}>
                  <a
                    className="cast-link"
                    href={`#cast-${other.id}`}
                    onClick={handleJump(`cast-${other.id}`)}
                  >
                    <span className="cast-link-name">{other.name}</span>
                    <span className="cast-link-note">{link.note}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <figure className="cast-plate">
        <div className="cast-plate-frame">
          <span className="cast-plate-index" aria-hidden="true">
            {PLATE_NUMERALS[index]}
          </span>
          <div className="cast-plate-art" aria-hidden="true">
            <CharacterGraphic character={member.id} state="idle" element={member.element} />
          </div>
          <span className="cast-plate-tag">
            {area.icon} {member.element}
          </span>
        </div>
        <figcaption className="cast-plate-caption">
          Plate {PLATE_NUMERALS[index]} — {member.name}, {area.name}
        </figcaption>
      </figure>
    </article>
  );
};

export const CastScreen: React.FC<CastScreenProps> = ({ onBackToGame, onOpenArmory }) => {
  return (
    <div className="cast-screen" data-testid="cast-screen">
      <div className="cast-scroll">
        <header className="cast-masthead" aria-labelledby="cast-title">
          <div className="cast-masthead-copy">
            <p className="cast-eyebrow">Cast of Characters</p>
            <h2 id="cast-title" className="cast-headline">
              Every name
              <br />
              has a <em>history.</em>
            </h2>
            <p className="cast-lead">
              A living reference of the people behind the bow — who they are, what they want, and
              the detail that gives them away.
            </p>
            <div className="cast-masthead-actions">
              <a
                className="cast-button cast-button--primary"
                href="#cast-index"
                onClick={handleJump('cast-index')}
              >
                Meet the cast
                <span aria-hidden="true" className="cast-button-mark">
                  ↓
                </span>
              </a>
              <p className="cast-masthead-meta">Four playable heroes · Volume I</p>
            </div>
          </div>

          <figure className="cast-frontispiece">
            <div className="cast-frontispiece-frame" aria-hidden="true">
              <CharacterGraphic character="archer" state="idle" element="wind" />
            </div>
            <figcaption>Frontispiece — Nila, Keeper of the Long Draw</figcaption>
          </figure>
        </header>

        <section id="cast-index" className="cast-contents" aria-labelledby="cast-contents-title">
          <div className="cast-section-head">
            <h3 id="cast-contents-title" className="cast-section-title">
              Contents
            </h3>
            <p className="cast-section-note">Four heroes, four realms, one range.</p>
          </div>
          <ol className="cast-index-list">
            {CAST_MEMBERS.map((member, index) => {
              const area = getWorldArea(member.realmId);
              return (
                <li key={member.id} className="cast-index-item">
                  <a
                    className="cast-index-row"
                    href={`#cast-${member.id}`}
                    onClick={handleJump(`cast-${member.id}`)}
                  >
                    <span className="cast-index-num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="cast-index-name">{member.name}</span>
                    <span className="cast-index-epithet">{member.epithet}</span>
                    <span className="cast-index-realm">
                      {area.icon} {area.name}
                    </span>
                    <span className="cast-index-jump" aria-hidden="true">
                      ↘
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="cast-entries">
          {CAST_MEMBERS.map((member, index) => (
            <CastEntry key={member.id} member={member} index={index} />
          ))}
        </div>

        <section className="cast-stat-band" aria-label="The cast at a glance">
          <div className="cast-stat">
            <strong>4</strong>
            <span>playable heroes</span>
          </div>
          <div className="cast-stat">
            <strong>6</strong>
            <span>realms to master</span>
          </div>
          <div className="cast-stat">
            <strong>50</strong>
            <span>arrows a day</span>
          </div>
          <p className="cast-stat-note">
            Every hero draws the same bow, answers the same questions, and earns the same arrows.
            Choose the one whose story you want to carry.
          </p>
        </section>

        <footer className="cast-closing" aria-labelledby="cast-closing-title">
          <p className="cast-eyebrow">The range is open</p>
          <h3 id="cast-closing-title" className="cast-closing-title">
            Pick a hero. Draw. Count.
          </h3>
          <p className="cast-closing-copy">
            Swap weapons and outfits for any hero in the Royal Armory, then take your quiver of
            fifty arrows to the range.
          </p>
          <div className="cast-closing-actions">
            <button
              className="cast-button cast-button--primary"
              type="button"
              onClick={onBackToGame}
            >
              Return to the range
            </button>
            <button className="cast-button cast-button--quiet" type="button" onClick={onOpenArmory}>
              Visit the Royal Armory
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
