# Fuel Now — Beta release notes / Notes de version / Notas de versión

Status: **DRAFT — NOT DISTRIBUTED**. Prepared 2026-09-07 for P5-REL-03a. This is a reusable test invitation draft, not a released build or permission to distribute.

## Release record to complete before distribution

| Field | Value |
| --- | --- |
| Build number, Git SHA and successful CI | Pending signed build |
| Test environment, API URL and coverage | Pending deployment; do not use development endpoints |
| Install link and supported iOS/Android versions | Pending distribution and device validation |
| Operator and private support contact | Pending user decision |
| Approved privacy policy / terms / source review | Pending LEG-01 to LEG-05 |
| Feedback channel owner and response expectations | Pending assignment; repository issue template prepared below |
| Test window and rollback owner | Pending release approval |

Do not replace these fields with guessed values. Never put credentials, provisioning profiles or invitation tokens in this public repository.

## English

Fuel Now is preparing a small, supervised test of finding fuel, charging, tyre-air and car-wash services in France and Spain. You can choose a location manually or request foreground location, compare nearby results, inspect available evidence and hand a public destination to an external navigation app. The interface supports English, French and Spanish.

This is an experimental decision aid, not a promise that a site is open, accessible or working. Current engineering checks cover bounded locations, not nationwide continuous coverage. Fuel prices can be old or missing. Spanish fuel prices without a trustworthy observation time are not shown as current prices. Static charging records describe sites, connectors and rated power, not live availability or charging tariffs. Unsupported hours, equipment status, waiting times and travel times remain unknown; sorting may fall back or exclude unverifiable results.

Use the app only when safely parked. Confirm price, access, equipment and opening hours with the operator before relying on a result. A navigation handoff is not proof of arrival or successful service. We do not provide emergency assistance.

Please report the build/platform, selected language, service and sort, brief steps, expected result and actual result. Use the in-app public station identifier only when necessary. Do not include your exact location, home/work address, journey history, raw request URLs, logs, keys, personal contact details or unredacted screenshots. The project repository is public. Send sensitive reports only through the approved private channel once one is published; until then, do not post them publicly.

## Français

Fuel Now prépare un petit test encadré pour rechercher des carburants, des bornes de recharge, du gonflage et des stations de lavage en France et en Espagne. Vous pouvez choisir un lieu manuellement ou demander la localisation au premier plan, comparer les résultats, consulter les éléments disponibles et transmettre une destination publique à une application de navigation. L’interface est disponible en français, anglais et espagnol.

Il s’agit d’une aide expérimentale, sans garantie qu’un site soit ouvert, accessible ou en état de marche. Les vérifications techniques portent sur des zones limitées, pas sur une couverture nationale continue. Les prix peuvent être anciens ou absents. Les prix espagnols sans date d’observation fiable ne sont pas affichés comme des prix actuels. Les données de recharge statiques décrivent les sites, connecteurs et puissances nominales, pas les places libres ni les tarifs en temps réel. Les horaires, états, attentes et durées de trajet non vérifiés restent inconnus ; le tri peut utiliser un autre mode ou écarter des résultats non vérifiables.

Utilisez l’application uniquement à l’arrêt, dans un endroit sûr. Vérifiez prix, accès, équipements et horaires auprès de l’exploitant. Ouvrir la navigation ne prouve ni l’arrivée ni la réussite du service. L’application n’est pas un service d’urgence.

Pour un retour, indiquez version/plateforme, langue, service/tri, étapes, résultat attendu et résultat obtenu. N’ajoutez un identifiant public de station que si nécessaire. Ne publiez pas de position précise, adresse privée, historique de trajet, URL de requête, journaux, clés, coordonnées personnelles ou captures non masquées. Le dépôt est public. Attendez la publication d’un canal privé approuvé pour tout signalement sensible ; ne le publiez pas dans une issue publique.

## Español

Fuel Now prepara una prueba pequeña y supervisada para buscar combustible, recarga, inflado de neumáticos y lavado en Francia y España. Permite elegir una ubicación manual o solicitar ubicación en primer plano, comparar resultados, consultar la información disponible y abrir un destino público en una aplicación de navegación. La interfaz está disponible en español, francés e inglés.

Es una ayuda experimental, no una garantía de que una instalación esté abierta, sea accesible o funcione. Las comprobaciones técnicas cubren zonas limitadas, no una cobertura nacional continua. Los precios pueden estar desactualizados o faltar. Los precios españoles sin fecha de observación fiable no se muestran como precios actuales. Los datos estáticos de recarga describen instalaciones, conectores y potencia nominal, no disponibilidad ni tarifas en tiempo real. Horarios, estado, espera y duración del viaje sin verificar siguen siendo desconocidos; el orden puede cambiar de modo o excluir resultados no verificables.

Use la aplicación únicamente cuando esté estacionado en un lugar seguro. Confirme precio, acceso, equipos y horarios con el operador. Abrir la navegación no demuestra llegada ni servicio realizado. No ofrecemos asistencia de emergencia.

Para informar de un problema, indique versión/plataforma, idioma, servicio/orden, pasos, resultado esperado y real. Incluya un identificador público de estación solo si hace falta. No publique ubicación exacta, direcciones privadas, historial de viajes, URL de solicitudes, registros, claves, datos personales ni capturas sin ocultar información sensible. El repositorio es público. Espere a que se publique un canal privado aprobado para enviar información sensible; no la publique en una incidencia pública.

## Feedback workflow — not yet activated for a released Beta

`.github/ISSUE_TEMPLATE/beta-feedback.yml` prepares structured, non-sensitive feedback in the existing repository. A tester must choose to submit it; this task creates no issues, sends no messages and subscribes no one. The eventual release owner must verify Issues availability, choose whether requiring a GitHub account is acceptable and provide a private alternative for sensitive reports. Do not distribute a Beta before that decision.

Triage: classify data quality / interface / failure / accessibility; reproduce using a public station and non-private manual location; link the fixing commit and regression test; obtain retest evidence on the reported platform. Security/privacy concerns must not collect more sensitive detail in a public issue. No response-time promise or personal-data retention period is invented here.

Acceptance remains blocked on the release record above. Engineering tests and generated JS bundles are not device or user acceptance.
