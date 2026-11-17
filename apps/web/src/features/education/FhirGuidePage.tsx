import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCode2,
  Layers3,
  UserRound,
} from 'lucide-react';
import { Link } from '../../app/router';
import './fhir-guide.css';

const patientResources = [
  {
    name: 'Patient',
    purpose: 'Identifica al paciente y contiene datos demográficos como la fecha de nacimiento.',
    location: 'Pacientes → abrir ficha → Resumen o FHIR JSON.',
    rule: 'Se usa para el contexto Patient y para calcular la edad.',
    code: 'birthDate',
  },
  {
    name: 'Observation',
    purpose: 'Registra mediciones y resultados, como presión arterial, HbA1c o glucosa.',
    location: 'Ficha → Observaciones; también en Editar dato.',
    rule: 'Las reglas miran el código, estado, valor y unidad. Ejemplo: HbA1c LOINC 4548-4.',
    code: 'code · status · valueQuantity',
  },
  {
    name: 'Condition',
    purpose: 'Representa diagnósticos o problemas de salud, como diabetes.',
    location: 'Ficha → Condiciones; también en Editar dato.',
    rule: 'Puedes comprobar código y estado clínico. Ejemplo de diabetes: SNOMED 44054006.',
    code: 'code · clinicalStatus',
  },
  {
    name: 'MedicationRequest',
    purpose: 'Representa una solicitud de medicamento.',
    location: 'Ficha → Medicamentos; las órdenes nuevas se inician en Recetar / indicar.',
    rule: 'En order-select, Selections identifica lo elegido ahora; permite separarlo del historial.',
    code: 'medicationCodeableConcept · status',
  },
  {
    name: 'ServiceRequest',
    purpose: 'Representa una solicitud de examen, procedimiento u otro servicio.',
    location: 'Recetar / indicar y ficha → Órdenes CDS.',
    rule: 'DraftOrders contiene las órdenes pendientes que se evalúan antes de firmar.',
    code: 'code · status · intent',
  },
  {
    name: 'AllergyIntolerance',
    purpose: 'Registra una alergia o intolerancia y su estado.',
    location: 'Ficha → Alergias; también en Recursos clínicos del sandbox.',
    rule: 'Una regla puede comprobar el código y si está activa o confirmada.',
    code: 'code · clinicalStatus · verificationStatus',
  },
  {
    name: 'Encounter',
    purpose: 'Representa una atención o encuentro con el equipo de salud.',
    location: 'Ficha → Encuentros; se puede agregar un encuentro pedagógico.',
    rule: 'Puedes usar su tipo, estado y período si la regla necesita contexto de atención.',
    code: 'type · status · period',
  },
  {
    name: 'Procedure',
    purpose: 'Describe un procedimiento realizado o registrado para el paciente.',
    location: 'Ficha → Procedimientos; también en Recursos clínicos del sandbox.',
    rule: 'Una solicitud pendiente se modela como ServiceRequest; Procedure describe el evento.',
    code: 'code · status · performed[x]',
  },
  {
    name: 'Immunization',
    purpose: 'Registra un evento de inmunización o vacunación.',
    location: 'Ficha → Inmunizaciones; también en Recursos clínicos del sandbox.',
    rule: 'Puede combinarse con otros datos si el escenario docente lo necesita.',
    code: 'vaccineCode · status · occurrence[x]',
  },
];

const infrastructureResources = [
  {
    name: 'Library',
    icon: FileCode2,
    detail: 'HAPI guarda aquí la regla: CQL, ELM y metadatos como hook y expresión.',
  },
  {
    name: 'Basic',
    icon: Database,
    detail:
      'Guarda datos auxiliares del sandbox, revisiones de órdenes y actividad CDS. El backend los convierte en recursos FHIR efectivos para evaluar.',
  },
  {
    name: 'Bundle',
    icon: Layers3,
    detail:
      'Agrupa recursos para transferirlos juntos. El backend usa bundles con datos del paciente y órdenes pendientes.',
  },
];

const flowSteps = [
  {
    number: '1',
    title: 'Elige datos FHIR',
    detail: 'Abre un paciente sintético y revisa o edita datos en tu sandbox.',
    icon: UserRound,
  },
  {
    number: '2',
    title: 'Escribe la condición CQL',
    detail: 'Consulta recursos, códigos, estados, valores, fechas o parámetros del hook.',
    icon: FileCode2,
  },
  {
    number: '3',
    title: 'Traduce y ejecuta',
    detail: 'El traductor produce ELM; el motor del backend evalúa ese ELM con datos FHIR.',
    icon: Activity,
  },
  {
    number: '4',
    title: 'Revisa la card',
    detail: 'Si la expresión Aplica devuelve true, la aplicación presenta una card.',
    icon: CheckCircle2,
  },
];

export function FhirGuidePage() {
  return (
    <section className="page fhir-guide">
      <header className="page-header guide-header">
        <div>
          <div className="guide-eyebrow">
            <BookOpenCheck size={16} aria-hidden />
            Guía para explorar el RCE
          </div>
          <h1>FHIR y reglas CQL dentro del RCE</h1>
          <p>
            Relaciona lo que ves en la ficha con el recurso HL7 FHIR que puede consultar una regla.
          </p>
        </div>
      </header>

      <aside className="guide-sandbox-note">
        <strong>Datos para practicar</strong>
        <span>
          Usa los pacientes sintéticos. Los cambios de Editar dato pertenecen a tu sandbox: se
          combinan con la ficha para probar reglas y no alteran el paciente base compartido.
        </span>
      </aside>

      <section className="guide-section" aria-labelledby="guide-flow-title">
        <div className="guide-section-heading">
          <div>
            <span className="guide-kicker">EL RECORRIDO</span>
            <h2 id="guide-flow-title">Del dato a la recomendación</h2>
          </div>
          <Link to="/activity" className="guide-inline-link">
            Ver actividad CDS <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        <div className="guide-flow">
          {flowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article className="guide-flow-step" key={step.number}>
                <div className="guide-step-top">
                  <span className="guide-step-number">{step.number}</span>
                  <Icon size={19} aria-hidden />
                </div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            );
          })}
        </div>
        <p className="guide-engine-note">
          <strong>Roles separados:</strong> HAPI almacena y entrega recursos; el servicio traductor
          convierte CQL a ELM; el motor CQL que corre en el backend evalúa ELM; NestJS coordina el
          hook y construye la card.
        </p>
      </section>

      <section className="guide-section" aria-labelledby="guide-resources-title">
        <div className="guide-section-heading">
          <div>
            <span className="guide-kicker">RECURSOS DE LA FICHA</span>
            <h2 id="guide-resources-title">Qué representa cada recurso y dónde verlo</h2>
            <p>Abre una ficha y usa sus pestañas; FHIR JSON permite inspeccionar el recurso.</p>
          </div>
          <Link to="/patients" className="guide-inline-link">
            Ir a pacientes <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        <div className="guide-resource-grid">
          {patientResources.map((resource) => (
            <article className="guide-resource-card" key={resource.name}>
              <div className="guide-resource-title">
                <h3>{resource.name}</h3>
                <code>{resource.code}</code>
              </div>
              <p>{resource.purpose}</p>
              <dl>
                <div>
                  <dt>Dónde</dt>
                  <dd>{resource.location}</dd>
                </div>
                <div>
                  <dt>En una regla</dt>
                  <dd>{resource.rule}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-section" aria-labelledby="guide-experiment-title">
        <div className="guide-section-heading">
          <div>
            <span className="guide-kicker">DATOS PARA PROBAR</span>
            <h2 id="guide-experiment-title">Qué puedes cambiar o combinar</h2>
            <p>Prueba una variable cada vez para saber qué parte hace cambiar el resultado.</p>
          </div>
          <Link to="/rules/new" className="guide-inline-link">
            Crear regla <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        <div className="guide-experiment-grid">
          <article>
            <h3>Datos del paciente</h3>
            <p>Fecha de nacimiento y sexo administrativo; permiten practicar edad y contexto.</p>
          </article>
          <article>
            <h3>Mediciones</h3>
            <p>
              Presión, HbA1c, glucosa, LDL, IMC, peso y talla. Explora código LOINC, valor y unidad
              UCUM.
            </p>
          </article>
          <article>
            <h3>Estado clínico</h3>
            <p>
              Agrega diagnósticos, alergias, medicamentos, encuentros, procedimientos, vacunas o
              solicitudes; prueba estados y códigos disponibles.
            </p>
          </article>
          <article>
            <h3>Contexto de orden</h3>
            <p>
              Al agregar una orden, order-select recibe Selections. Antes de firmar, order-sign
              recibe DraftOrders.
            </p>
          </article>
        </div>
        <div className="guide-cql-tips">
          <strong>Ideas para una condición CQL</strong>
          <code>AgeInYears() &gt;= 60</code>
          <code>Observation.code + valueQuantity + status</code>
          <code>Condition.code + clinicalStatus</code>
          <code>MedicationRequest / ServiceRequest + Selections o DraftOrders</code>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="guide-infrastructure-title">
        <div className="guide-section-heading">
          <div>
            <span className="guide-kicker">RECURSOS DE SOPORTE</span>
            <h2 id="guide-infrastructure-title">Qué guarda o transporta la aplicación</h2>
          </div>
        </div>
        <div className="guide-infrastructure-grid">
          {infrastructureResources.map((resource) => {
            const Icon = resource.icon;
            return (
              <article className="guide-infrastructure-card" key={resource.name}>
                <Icon size={19} aria-hidden />
                <div>
                  <h3>{resource.name}</h3>
                  <p>{resource.detail}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="guide-section guide-hook-section" aria-labelledby="guide-hooks-title">
        <div className="guide-section-heading">
          <div>
            <span className="guide-kicker">DÓNDE SE DISPARA</span>
            <h2 id="guide-hooks-title">Elige el hook según el momento</h2>
          </div>
        </div>
        <div className="guide-hook-grid">
          <div>
            <span>patient-view</span>
            <p>Al abrir o reevaluar la ficha. Trabaja con Patient y sus recursos clínicos.</p>
          </div>
          <div>
            <span>order-select</span>
            <p>Al agregar una orden. Compara lo seleccionado con los datos del paciente.</p>
          </div>
          <div>
            <span>order-sign</span>
            <p>Al pedir la revisión para firmar, antes de guardar las órdenes en el sandbox.</p>
          </div>
        </div>
        <p className="guide-closing-note">
          Las cards orientan la revisión educativa. La evaluación no firma automáticamente una orden
          ni la envía a una farmacia.
        </p>
      </section>

      <footer className="guide-footer">
        <ClipboardList size={17} aria-hidden />
        <span>Revisa el resultado y los recursos considerados en Actividad CDS → Paso a paso.</span>
        <Link to="/activity" className="guide-inline-link">
          Abrir actividad <ArrowRight size={15} aria-hidden />
        </Link>
      </footer>
    </section>
  );
}
