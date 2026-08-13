(()=>{
  const PORTFOLIO='https://mikelninh.github.io/';
  const path=location.pathname.replace(/\/$/,'')||'/';

  const person=document.querySelector('.person');
  if(person){
    person.href=PORTFOLIO;
    person.target='_blank';
    person.rel='noopener';
    person.textContent='Michael Ninh · Portfolio ↗';
  }

  if(path.startsWith('/proof/')){
    let meta=document.querySelector('meta[name="robots"]');
    if(!meta){meta=document.createElement('meta');meta.name='robots';document.head.appendChild(meta)}
    meta.content='noindex,nofollow';
    return;
  }
  if(path!=='/') return;

  const navLinks=document.querySelector('.nav nav');
  if(navLinks&&!navLinks.querySelector('a[href="#about"]')){
    navLinks.insertAdjacentHTML('beforeend','<a href="#about">About</a>');
  }

  const hero=document.querySelector('.hero');
  const heroPill=hero?.querySelector('.pill');
  const heroTitle=hero?.querySelector('h1');
  const heroCopy=hero?.querySelector('.hero-copy>p');
  const heroPrimary=hero?.querySelector('.actions .primary');
  if(heroPill) heroPill.textContent='Human-supervised AI workers';
  if(heroTitle) heroTitle.innerHTML='Automate repeatable work.<br><em>Keep humans in control.</em>';
  if(heroCopy) heroCopy.textContent='Digital Worker Factory turns a repeatable workflow into an AI worker that must show evidence, obey explicit policy and ask before consequential actions.';
  if(heroPrimary){heroPrimary.href='#proofs';heroPrimary.textContent='Try a worker →'}

  const heroActions=document.querySelector('.hero .actions');
  if(heroActions&&!heroActions.querySelector('[data-main-portfolio]')){
    heroActions.insertAdjacentHTML('beforeend',`<a class="btn" data-main-portfolio href="${PORTFOLIO}" target="_blank" rel="noopener">Main portfolio ↗</a>`);
  }

  if(hero&&!document.querySelector('.factory-benefit')){
    hero.insertAdjacentHTML('afterend',`
      <section class="section factory-benefit">
        <header class="benefit-head"><div><span>Why this exists</span><h2>The useful part is not letting an AI click buttons faster.</h2></div><p>The useful part is taking repetitive work away from people while keeping evidence, permissions and responsibility visible.</p></header>
        <div class="benefit-grid">
          <article class="before"><small>WITHOUT A CONTROL LAYER</small><h3>“The agent says it is done.”</h3><ul><li>missing work can look complete</li><li>permissions live inside prompts</li><li>failures are hard to replay</li><li>humans receive a conclusion without the trace</li></ul></article>
          <article class="after"><small>WITH THE FACTORY</small><h3>Work has to earn completion.</h3><ul><li>required evidence is checked</li><li>policy sits outside the model</li><li>consequential actions wait for approval</li><li>failures become repeatable eval cases</li></ul></article>
        </div>
        <div class="control-loop"><span>AI proposes</span><b>→</b><span>runtime checks</span><b>→</b><span>human approves</span><b>→</b><span>trace becomes evidence</span></div>
      </section>`);
  }

  const proofSection=document.querySelector('#proofs');
  if(proofSection){
    proofSection.innerHTML=`
      <header class="section-head"><div><span>Try the Factory</span><h2>Same control layer. Five different jobs.</h2></div><p>The public examples are synthetic. Pick the workflow closest to your world and inspect what the worker does, what it cannot do, and where a human gate appears.</p></header>
      <div class="public-proof-grid demo-doors">
        <article class="mint"><span class="public-proof-icon">▤</span><small>DOCUMENT REVIEW</small><h3>PrüfPilot</h3><p>Documents + rules → evidence gaps → reviewable next action.</p><a href="/proof/aconium">Run the case →</a></article>
        <article class="lavender"><span class="public-proof-icon">◉</span><small>RELIABILITY</small><h3>CasePilot</h3><p>See a worker fail a completion gate, then replay the revised procedure.</p><a href="/proof/interloom">Break the workflow →</a></article>
        <article class="peach"><span class="public-proof-icon">⚖</span><small>LEGAL WORKFLOW</small><h3>KanzleiPilot</h3><p>Grounded legal work with a hard review gate before external action.</p><a href="/proof/conny">Run the legal worker →</a></article>
        <article class="sky"><span class="public-proof-icon">⌂</span><small>PUBLIC SERVICE</small><h3>BürgerPilot</h3><p>Turn a life event into a bounded, auditable next public-service action.</p><a href="/proof/digitalservice">Run the service worker →</a></article>
        <article class="butter"><span class="public-proof-icon">▦</span><small>WORKFLOW BUILDER</small><h3>Worker Builder</h3><p>Compose capabilities, policy and evals around one messy operational workflow.</p><a href="/proof/overfly">Run the delivery proof →</a></article>
      </div>`;
  }

  const closing=document.querySelector('.closing');
  if(closing){
    closing.insertAdjacentHTML('beforebegin',`
      <section class="section about" id="about">
        <header class="about-head"><div><span>About Michael</span><h2>I want to build things that are genuinely useful to humans.</h2></div><p>I’m an AI engineer in Berlin. I’m happiest where technology, product thinking and human problems meet — especially when the system is complicated and the experience can become simple.</p></header>
        <div class="about-grid">
          <article><small>HOW I THINK</small><h3>Make the system understandable.</h3><p>Find the structure underneath messy problems, then make the important parts visible instead of hiding complexity behind AI confidence.</p></article>
          <article><small>HOW I WORK</small><h3>Learn by shipping.</h3><p>Small iterations, real feedback, honest evals and clear next actions. User-found failures should become better system behaviour.</p></article>
          <article><small>WHAT PULLS ME IN</small><h3>Work with human consequence.</h3><p>Public services, law, care, health, education and operations — places where better systems can return attention to people.</p></article>
          <article><small>ALSO ME</small><h3>Play matters.</h3><p>I like beautiful interfaces, games, movement, good food and ideas that make people curious. Serious engineering does not have to feel grey.</p></article>
        </div>
        <div class="team-note"><span>NORTH STAR</span><strong>Technology should return human attention to things worthy of being human.</strong><div><a href="${PORTFOLIO}" target="_blank" rel="noopener">Portfolio ↗</a><a href="mailto:mikel_ninh@yahoo.de">Talk to me →</a><a href="https://github.com/mikelninh" target="_blank">GitHub ↗</a></div></div>
      </section>`);
    const link=closing.querySelector('a');
    if(link){link.href='https://github.com/mikelninh/digital-worker-factory';link.target='_blank';link.textContent='Explore the engineering →'}
  }

  const footerLinks=document.querySelector('footer div');
  if(footerLinks&&!footerLinks.querySelector('[data-footer-portfolio]')){
    footerLinks.insertAdjacentHTML('afterbegin',`<a data-footer-portfolio href="${PORTFOLIO}" target="_blank" rel="noopener">Portfolio ↗</a>`);
  }
})();
