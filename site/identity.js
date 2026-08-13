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

  const heroActions=document.querySelector('.hero .actions');
  if(heroActions&&!heroActions.querySelector('[data-main-portfolio]')){
    heroActions.insertAdjacentHTML('beforeend',`<a class="btn" data-main-portfolio href="${PORTFOLIO}" target="_blank" rel="noopener">Main portfolio ↗</a>`);
  }

  const proofSection=document.querySelector('#proofs');
  if(proofSection){
    proofSection.innerHTML=`
      <header class="section-head"><div><span>Proof of work</span><h2>Four systems. One engineering thesis.</h2></div><p>I like taking messy human workflows and turning them into systems that are grounded, bounded, observable and useful.</p></header>
      <div class="public-proof-grid">
        <article><span class="public-proof-icon">▤</span><small>Document AI</small><h3>PrüfPilot</h3><p>Rules, documents and evidence become a human-reviewable next action.</p><a href="https://pruefpilot-aconium.vercel.app" target="_blank">Open live system ↗</a></article>
        <article><span class="public-proof-icon">⚖</span><small>Legal intelligence</small><h3>GitLaw</h3><p>Grounded German legal research with inspectable retrieval and deterministic citation verification.</p><a href="https://mikelninh.github.io/gitlaw/" target="_blank">Open live system ↗</a></article>
        <article><span class="public-proof-icon">◉</span><small>Agent reliability</small><h3>CasePilot</h3><p>Trust the trace, not the claim: completion gates, replay and failure-specific evals.</p><a href="#principles">See the reliability thesis ↓</a></article>
        <article><span class="public-proof-icon">▦</span><small>Reusable infrastructure</small><h3>Worker Factory</h3><p>Compose capabilities, policy, approvals and evals into workers that can earn autonomy.</p><a href="https://github.com/mikelninh/digital-worker-factory" target="_blank">View code ↗</a></article>
      </div>`;
  }

  const closing=document.querySelector('.closing');
  if(closing){
    closing.insertAdjacentHTML('beforebegin',`
      <section class="section about" id="about">
        <header class="about-head"><div><span>About Michael</span><h2>I want to build things that are genuinely useful to humans.</h2></div><p>I’m an AI engineer in Berlin. I’m happiest where technology, product thinking and human problems meet — especially when the system is complicated and the experience can become simple.</p></header>
        <div class="about-grid">
          <article><small>HOW I THINK</small><h3>Make the system understandable.</h3><p>I like finding the structure underneath messy problems, then making the important parts visible instead of hiding complexity behind AI confidence.</p></article>
          <article><small>HOW I WORK</small><h3>Learn by shipping.</h3><p>Small iterations, real feedback, honest evals and clear next actions. I value autonomy, high standards and teammates who can challenge each other without ego.</p></article>
          <article><small>WHAT PULLS ME IN</small><h3>Work with human consequence.</h3><p>Public services, law, care, health, education, operations — places where better systems can remove friction and reduce avoidable suffering.</p></article>
          <article><small>ALSO ME</small><h3>Play matters.</h3><p>I like beautiful interfaces, games, movement, good food and ideas that make people curious. Serious engineering does not have to feel grey.</p></article>
        </div>
        <div class="team-note"><span>WHAT I’M LOOKING FOR</span><strong>A small, ambitious team building something that matters — with room to own problems end to end.</strong><div><a href="${PORTFOLIO}" target="_blank" rel="noopener">Portfolio ↗</a><a href="mailto:mikel_ninh@yahoo.de">Talk to me →</a><a href="https://github.com/mikelninh" target="_blank">GitHub ↗</a></div></div>
      </section>`);
    const link=closing.querySelector('a');
    if(link){link.href='https://github.com/mikelninh/digital-worker-factory';link.target='_blank';link.textContent='Explore the engineering →'}
  }

  const footerLinks=document.querySelector('footer div');
  if(footerLinks&&!footerLinks.querySelector('[data-footer-portfolio]')){
    footerLinks.insertAdjacentHTML('afterbegin',`<a data-footer-portfolio href="${PORTFOLIO}" target="_blank" rel="noopener">Portfolio ↗</a>`);
  }
})();
