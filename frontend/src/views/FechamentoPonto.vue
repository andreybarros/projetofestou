<template>
  <div class="fp-wrap">

    <!-- ══ LISTA DE FUNCIONÁRIOS ══════════════════════════════════ -->
    <template v-if="!funcSelecionado">

      <div class="fp-header">
        <div>
          <h1 class="fp-title">Fechamento de Ponto</h1>
          <span class="fp-sub">Selecione um funcionário para fechar a folha</span>
        </div>
      </div>

      <div class="fp-filtros">
        <div class="search-wrap">
          <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="busca" type="text" placeholder="Buscar por nome ou matrícula…" class="fp-input search-input" />
        </div>
        <div class="filtro-tabs">
          <button :class="['ftab', { active: filtro === 'todos' }]"       @click="filtro='todos'">Todos</button>
          <button :class="['ftab', { active: filtro === 'mensalistas' }]" @click="filtro='mensalistas'">Mensalistas</button>
          <button :class="['ftab', { active: filtro === 'diaristas' }]"   @click="filtro='diaristas'">Diaristas</button>
        </div>
      </div>

      <div v-if="carregandoLista" class="estado-msg"><div class="spin"></div></div>
      <div v-else-if="filtrados.length === 0" class="estado-msg">Nenhum funcionário encontrado.</div>

      <div v-else class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Tipo</th>
              <th>Salário / Diária</th>
              <th>Último Fechamento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filtrados" :key="f.pk">
              <td>
                <div class="fn-nome-cell">
                  <div class="fn-avatar">{{ f.nome.charAt(0).toUpperCase() }}</div>
                  <div>
                    <span class="fn-nome">{{ f.nome }}</span>
                    <span class="fn-mat">{{ f.matricula || '—' }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['badge-tipo', f.diarista ? 'diarista' : 'mensalista']">
                  {{ f.diarista ? 'Diarista' : 'Mensalista' }}
                </span>
              </td>
              <td class="td-mono">{{ f.diarista ? fmt(f.valor_diaria) + '/dia' : fmt(f.salario_mensal) }}</td>
              <td class="td-muted">{{ ultimoFechamento(f.pk) }}</td>
              <td>
                <button class="btn-fechar" @click="selecionarFunc(f)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Fechar Folha
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="tabela-rodape">{{ filtrados.length }} funcionário(s)</div>
      </div>

    </template>

    <!-- ══ PAINEL DE FECHAMENTO ════════════════════════════════════ -->
    <template v-else>

      <!-- Header do fechamento -->
      <div class="fp-header">
        <div>
          <button class="btn-voltar" @click="voltarLista">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            Voltar
          </button>
          <h1 class="fp-title" style="margin-top:8px">{{ funcSelecionado.nome }}</h1>
          <span class="fp-sub">Matrícula: {{ funcSelecionado.matricula || '—' }} · {{ funcSelecionado.diarista ? 'Diarista' : 'Mensalista' }}</span>
        </div>
      </div>

      <!-- Seletor de período -->
      <div class="periodo-bar">
        <select v-model="quinzena" class="fp-select" @change="carregar">
          <option :value="1">1ª Quinzena (01 a 15)</option>
          <option :value="2">2ª Quinzena (16 ao fim)</option>
        </select>
        <select v-model="mes" class="fp-select" @change="carregar">
          <option v-for="(nm, idx) in meses" :key="idx+1" :value="idx+1">{{ nm }}</option>
        </select>
        <select v-model="ano" class="fp-select" @change="carregar">
          <option v-for="a in anos" :key="a" :value="a">{{ a }}</option>
        </select>
        <div v-if="carregandoFech" class="spin-sm"></div>
      </div>

      <!-- Alerta: período bloqueado -->
      <div v-if="bloqueado" class="alerta alerta-bloqueado">
        <div>🔒 <strong>Período Bloqueado:</strong> Este período já foi finalizado.</div>
        <button class="btn-reabrir" @click="desbloquear">🔑 Reabrir Período</button>
      </div>

      <!-- Alerta: espelho -->
      <div v-if="espelhoStatus !== 'rascunho'" :class="['alerta', 'alerta-espelho-' + espelhoStatus]">
        <span v-if="espelhoStatus === 'enviado'">⏳ <strong>Espelho enviado.</strong> Aguardando aprovação do funcionário.</span>
        <span v-else-if="espelhoStatus === 'aprovado'">✅ <strong>Espelho aprovado.</strong> Você pode finalizar o fechamento.</span>
        <span v-else-if="espelhoStatus === 'rejeitado'">❌ <strong>Espelho rejeitado.</strong> Motivo: <em>{{ espelhoObs || '—' }}</em>. Revise e reenvie.</span>
      </div>

      <div class="close-layout">

        <!-- Coluna esquerda: estatísticas + tabela de dias -->
        <div class="close-left">

          <!-- Cards de resumo -->
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Saldo Anterior</div>
              <div class="stat-val">{{ fmtH(summaries.saldoAnt) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Previsto (Período)</div>
              <div class="stat-val">{{ fmtH(summaries.previsto / 3600) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Trabalhado</div>
              <div class="stat-val">{{ fmtH(summaries.trabalhado / 3600) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Saldo do Período</div>
              <div :class="['stat-val', summaries.saldoMes >= 0 ? 'pos' : 'neg']">
                {{ (summaries.saldoMes >= 0 ? '+' : '') + summaries.saldoMes.toFixed(2) }}h
              </div>
            </div>
            <div class="stat-box stat-box-destaque">
              <div class="stat-label">Saldo Acumulado (Final)</div>
              <div class="stat-val">{{ saldoFinal.toFixed(2) }}h</div>
            </div>
          </div>

          <!-- Tabela de dias -->
          <div class="tabela-wrap" style="margin-top:0">
            <table class="tabela tabela-dias">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Jornada</th>
                  <th>Batidas</th>
                  <th>Líquido</th>
                  <th>Saldo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="d in diasPeriodo" :key="d.dtStr"
                  :class="{ 'row-domingo': d.isDomingo && d.trabalhado > 0 }"
                >
                  <td>
                    {{ d.dia }}/{{ mes }} ({{ d.dayName }})
                    <span v-if="d.isDomingo && d.trabalhado > 0" class="badge-dom">Dom ×2</span>
                  </td>
                  <td>
                    <strong v-if="d.just">{{ '[' + d.just.tipo + ']' }}</strong>
                    <span v-else-if="d.previsto > 0">{{ formatSec(d.previsto) }}</span>
                    <span v-else class="td-muted">—</span>
                  </td>
                  <td class="td-mono td-muted">{{ d.batidas.join(' | ') || '—' }}</td>
                  <td>{{ d.trabalhado > 0 ? formatSec(d.trabalhado) : '—' }}</td>
                  <td :class="d.diff > 0 ? 'pos' : d.diff < 0 ? 'neg' : ''">
                    {{ d.diff === 0 ? '—' : (d.diff > 0 ? '+' : '-') + formatSec(Math.abs(d.diff)) }}
                  </td>
                  <td>
                    <div class="td-acoes">
                      <button class="btn-just btn-batidas" @click="abrirBatidas(d)">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Batidas
                      </button>
                      <button
                        v-if="!bloqueado"
                        class="btn-just"
                        @click="abrirJustificativa(d)"
                      >Justificar</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Coluna direita: painel financeiro -->
        <div class="close-right">
          <div class="fin-card">
            <h3 class="fin-title">Resumo Financeiro</h3>

            <!-- Salário base -->
            <div class="fin-row-group">
              <div class="fin-stat">
                <span class="fin-label">{{ funcSelecionado.diarista ? 'Valor da Diária' : 'Salário Base' }}</span>
                <span class="fin-val">{{ fmt(summaries.baseSalary) }}</span>
              </div>
              <div class="fin-stat">
                <span class="fin-label">{{ funcSelecionado.diarista ? 'Total por Diárias' : 'Salário Proporcional' }}</span>
                <span class="fin-val">{{ labelProp }}</span>
              </div>
            </div>

            <!-- Banco de horas extras -->
            <div v-if="extraTotalH > 0" class="extra-card">
              <div class="extra-title">🕐 Banco de Horas Extras</div>
              <div class="extra-linha">
                <span>Extras normais (Seg–Sáb)</span>
                <strong>{{ extraNormalH.toFixed(2) }}h</strong>
              </div>
              <div class="extra-linha">
                <span>Extras Domingo <small>(×2 = 100%)</small></span>
                <strong>{{ extraDomRawH.toFixed(2) }}h → {{ extraDomValH.toFixed(2) }}h</strong>
              </div>
              <div class="extra-linha extra-total">
                <span>Total disponível</span>
                <strong>{{ extraTotalH.toFixed(2) }}h</strong>
              </div>
            </div>

            <!-- Pagamento de Horas Extras -->
            <div class="fin-field">
              <label>Pagar Horas Extras (Banco)</label>
              <div class="extra-pay-grid">
                <!-- Extras Normais -->
                <div class="extra-pay-item">
                  <span class="extra-pay-label">Normais (60%)</span>
                  <span class="extra-pay-rate">{{ fmt(valorHoraNormal) }}/h</span>
                  <div class="fin-field-row">
                    <input v-model.number="pagarHorasNormal" type="number" min="0" :max="extraNormalH" step="0.5" class="fp-input fin-input" :disabled="bloqueado" />
                    <span class="fin-unit">h</span>
                  </div>
                  <small class="td-muted">Disp: {{ extraNormalH.toFixed(2) }}h</small>
                </div>
                <!-- Extras Domingo -->
                <div class="extra-pay-item extra-pay-dom">
                  <span class="extra-pay-label">Domingo (100%)</span>
                  <span class="extra-pay-rate">{{ fmt(valorHoraDomingo) }}/h</span>
                  <div class="fin-field-row">
                    <input v-model.number="pagarHorasDomingo" type="number" min="0" :max="extraDomRawH" step="0.5" class="fp-input fin-input" :disabled="bloqueado" />
                    <span class="fin-unit">h</span>
                  </div>
                  <small class="td-muted">Disp: {{ extraDomRawH.toFixed(2) }}h</small>
                </div>
              </div>
              <div v-if="!bloqueado" class="extra-pay-actions">
                <button class="btn-banco-acao" @click="pagarTudoExtra">Pagar Tudo Disponível</button>
                <button class="btn-banco-acao btn-dom" @click="pagarSoDomingo">Pagar Só Domingo</button>
              </div>
              <small style="margin-top:4px">O desconto no banco de horas é automático (Domingo desconta ×2).</small>
            </div>

            <!-- Descontos -->
            <div class="fin-field">
              <label>Descontos Detalhados</label>
              <div class="descontos-lista">
                <div v-if="descontos.length === 0" class="descontos-vazio">Nenhum desconto lançado.</div>
                <div v-for="(d, i) in descontos" :key="i" class="desconto-item">
                  <span>{{ d.descricao }}</span>
                  <div class="desconto-item-right">
                    <strong>{{ fmt(d.valor) }}</strong>
                    <button v-if="!bloqueado" class="btn-rm-desc" @click="removerDesconto(i)">×</button>
                  </div>
                </div>
              </div>
              <div v-if="!bloqueado" class="desconto-add">
                <input v-model="novoDescNome"  type="text"   placeholder="Motivo (ex: Vale)" class="fp-input" />
                <input v-model.number="novoDescVal" type="number" placeholder="R$" class="fp-input" style="width:80px" />
                <button class="btn-add-desc" @click="addDesconto">+</button>
              </div>
            </div>

            <div class="fin-field">
              <label>Total Descontos (R$)</label>
              <input :value="totalDescontos.toFixed(2)" type="text" readonly class="fp-input" style="opacity:.7" />
            </div>

            <!-- Total líquido -->
            <div class="total-box">
              <span>TOTAL LÍQUIDO A PAGAR</span>
              <strong>{{ fmt(totalLiquido) }}</strong>
            </div>

            <!-- Botões de ação -->
            <button class="btn-ajustar-batidas" @click="abrirTodasBatidas" style="margin-bottom: 8px;">
              <span class="material-symbols-outlined" style="font-size: 20px;">location_on</span>
              Ajustar Batidas / Localização
            </button>

            <button
              v-if="!bloqueado"
              class="btn-espelho"
              :disabled="salvando"
              @click="enviarEspelho"
            >
              📤 Enviar Espelho para Aprovação
            </button>
            <button
              v-if="!bloqueado"
              class="btn-salvar"
              :disabled="salvando || espelhoStatus !== 'aprovado'"
              :title="espelhoStatus !== 'aprovado' ? 'Aguardando aprovação do espelho' : ''"
              @click="salvar"
            >
              <span v-if="salvando" class="spin-xs"></span>
              {{ salvando ? 'Salvando…' : 'Salvar e Bloquear Período' }}
            </button>
          </div>
        </div>

      </div>
    </template>

    <!-- Modal Batidas do Dia -->
    <Teleport to="body">
      <div v-if="modalBatidas" class="modal-backdrop" @click.self="fecharBatidas">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">Batidas do Dia</h2>
              <p class="modal-date" style="margin:2px 0 0">{{ batidasDia }}</p>
            </div>
            <button class="modal-close" @click="fecharBatidas">×</button>
          </div>

          <div class="modal-body">

            <!-- Lista de batidas existentes -->
            <div v-if="carregandoBatidas" class="batidas-loading"><div class="spin-sm"></div> Carregando...</div>
            <div v-else-if="batidasLista.length === 0" class="batidas-vazio">Nenhuma batida registrada neste dia.</div>
            <div v-else class="batidas-lista">
              <div v-for="b in batidasLista" :key="b.pk" class="batida-item">
                <div class="batida-item-left">
                  <span :class="['badge-tipo', tipoBaseBatida(b.tipo) === 'entrada' ? 'entrada' : 'saida']">
                    {{ tipoBaseBatida(b.tipo).toUpperCase() }}
                  </span>
                  <span v-if="b.tipo.includes('_manual')" class="badge-manual">MANUAL</span>
                  
                  <!-- Localização -->
                  <button v-if="b.latitude" @click="abrirMapa(b)" class="link-modal-gps" title="Ver localização no mapa" style="background:none;border:none;cursor:pointer;padding:0">
                    <span class="material-symbols-outlined" style="font-size:18px">map</span>
                  </button>
                </div>
                <span class="batida-hora">{{ b.hora.substring(0, 5) }}</span>
                <button class="btn-rm-batida" @click="removerBatida(b)" title="Remover batida">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>

            <!-- Adicionar nova batida -->
            <div class="batidas-add-section">
              <div class="batidas-add-title">Adicionar Batida Manual</div>
              <div class="batidas-add-form">
                <select v-model="novaBatidaTipo" class="fp-input" style="width:130px">
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
                <input v-model="novaBatidaHora" type="time" class="fp-input" style="width:130px" />
                <button
                  class="btn-add-batida"
                  :disabled="!novaBatidaHora || adicionandoBatida"
                  @click="adicionarBatida"
                >
                  <span v-if="adicionandoBatida" class="spin-xs"></span>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Adicionar
                </button>
              </div>
            </div>

          </div>

          <div class="modal-footer">
            <button class="modal-btn save" style="max-width:140px" @click="fecharBatidas">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Justificativa -->
    <Teleport to="body">
      <div v-if="modalJust" class="modal-backdrop" @click.self="fecharJust">
        <div class="modal-box">
          <div class="modal-header">
            <h2 class="modal-title">Justificar Falta / Abono</h2>
            <button class="modal-close" @click="fecharJust">×</button>
          </div>
          <div class="modal-body">
            <p class="modal-date">{{ justDia }}</p>
            <div class="form-field">
              <label>Tipo de Justificativa</label>
              <select v-model="justTipo" class="fp-input">
                <option value="Atestado Médico">Atestado Médico</option>
                <option value="Abono">Abono</option>
                <option value="Folga">Folga</option>
                <option value="Feriado">Feriado</option>
                <option value="Outros">Outros</option>
                <option value="">(Remover Justificativa)</option>
              </select>
            </div>
            <div class="form-field">
              <label>Observações</label>
              <textarea v-model="justObs" rows="2" class="fp-input fp-textarea"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-btn cancel" @click="fecharJust">Cancelar</button>
            <button class="modal-btn save" :disabled="salvandoJust" @click="salvarJustificativa">
              <span v-if="salvandoJust" class="spin-xs"></span>
              {{ salvandoJust ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Todas as Batidas (Período) -->
    <Teleport to="body">
      <div v-if="modalTodasBatidas" class="modal-backdrop" @click.self="modalTodasBatidas = false">
        <div class="modal-box modal-box-lg" style="max-width: 650px;">
          <div class="modal-header">
            <h2 class="modal-title">Gestão de Batidas - Período</h2>
            <button class="modal-close" @click="modalTodasBatidas = false">×</button>
          </div>
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto; padding: 0;">
            <table class="tabela-geral-batidas">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Origem / GPS</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in sortedPunches" :key="b.pk">
                  <td>{{ b.data.split('-').reverse().join('/') }}</td>
                  <td><strong>{{ b.hora.substring(0, 5) }}</strong></td>
                  <td>
                    <span :class="['badge-tipo-small', tipoBaseBatida(b.tipo)]">{{ tipoBaseBatida(b.tipo).toUpperCase() }}</span>
                  </td>
                  <td>
                    <div class="gps-cell">
                      <span v-if="b.tipo.includes('_manual')" class="badge-manual">MANUAL</span>
                      <button v-if="b.latitude" @click="abrirMapa(b)" class="link-gps" style="background:none;border:none;cursor:pointer;padding:0">
                        <span class="material-symbols-outlined" style="font-size:16px">location_on</span>
                        Ver Mapa
                      </button>
                      <span v-else-if="!b.tipo.includes('_manual')" class="td-muted">Sem GPS</span>
                    </div>
                  </td>
                  <td>
                    <button class="btn-rm-batida" @click="removerBatida(b)" title="Remover batida">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="punches.length === 0" class="estado-msg">Nenhuma batida registrada no período.</div>
          </div>
          <div class="modal-footer">
            <p class="td-muted" style="font-size: .7rem; flex: 1;">Para adicionar batidas, clique no dia desejado na tabela principal.</p>
            <button class="modal-btn cancel" @click="modalTodasBatidas = false">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Mapa -->
    <Teleport to="body">
      <div v-if="modalMapa" class="modal-backdrop" @click.self="modalMapa = false" style="z-index: 10001;">
        <div class="modal-box" style="max-width:600px; width:100%; overflow:hidden;">
          <div class="modal-header">
            <h2 class="modal-title">Localização da Batida</h2>
            <button class="modal-close" @click="modalMapa = false">×</button>
          </div>
          <div class="modal-body" style="padding:0">
            <div id="mapa-fp-container" style="height:400px; width:100%; background:#000;"></div>
            <div style="padding:12px 20px; display:flex; justify-content:space-between; background:var(--bg3); border-top:1px solid var(--border);">
              <span style="font-weight:700;">{{ batidaMapa?.data?.split('-').reverse().join('/') }}</span>
              <span style="font-size:.85rem; color:var(--text2);">{{ batidaMapa?.hora?.substring(0,5) }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-btn cancel" @click="modalMapa = false">Fechar Mapa</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" :class="['fp-toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import apiClient from '../services/api';
import { supabase } from '../composables/useSupabase';

const sessao = useSessaoStore();

// ── Lista ──────────────────────────────────────────────────────────────────
const lista          = ref([]);
const carregandoLista = ref(true);
const busca          = ref('');
const filtro         = ref('todos');
const ultimosFech    = ref({}); // pk → string

const filtrados = computed(() => {
  let l = lista.value.filter(f => f.ativo);
  const q = busca.value.trim().toLowerCase();
  if (q) l = l.filter(f => f.nome.toLowerCase().includes(q) || (f.matricula || '').toLowerCase().includes(q));
  if (filtro.value === 'mensalistas') l = l.filter(f => !f.diarista);
  if (filtro.value === 'diaristas')   l = l.filter(f => f.diarista);
  return l;
});

function ultimoFechamento(pk) {
  return ultimosFech.value[pk] || '—';
}

// ── Painel de fechamento ───────────────────────────────────────────────────
const funcSelecionado = ref(null);
const carregandoFech  = ref(false);

const hoje    = new Date();
const meses   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const anos    = [hoje.getFullYear() - 1, hoje.getFullYear()];
const quinzena = ref(hoje.getDate() <= 15 ? 1 : 2);
const mes      = ref(hoje.getMonth() + 1);
const ano      = ref(hoje.getFullYear());

const bloqueado     = ref(false);
const espelhoStatus = ref('rascunho');
const espelhoObs    = ref('');
const fechPk        = ref(null);
const punches       = ref([]);
const justs         = ref([]);
const descontos     = ref([]);
const novoDescNome  = ref('');
const novoDescVal   = ref(null);
const salvando      = ref(false);

const summaries = ref({
  saldoAnt: 0, previsto: 0, trabalhado: 0,
  saldoMes: 0, saldoAcum: 0, baseSalary: 0,
  horasFechamento: 120, missingSec: 0,
  extraSecNormal: 0, extraSecDomingo: 0, extraSec: 0, diasPagos: 0,
});

const pagarHorasNormal  = ref(0);
const pagarHorasDomingo = ref(0);
const diasPeriodo = ref([]);

const sortedPunches = computed(() => {
  return [...punches.value].sort((a,b) => {
    if (a.data !== b.data) return a.data > b.data ? 1 : -1;
    return a.hora > b.hora ? 1 : -1;
  });
});

const modalTodasBatidas = ref(false);
function abrirTodasBatidas() { modalTodasBatidas.value = true; }

const modalMapa  = ref(false);
const batidaMapa = ref(null);
let   L_map      = null;

async function carregarLeaflet() {
  if (window.L) return true;
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

watch(modalMapa, (val) => {
  if (!val && L_map) { L_map.remove(); L_map = null; }
});

async function abrirMapa(b) {
  batidaMapa.value = b;
  modalMapa.value = true;
  const pronto = await carregarLeaflet();
  if (!pronto || !window.L) return;
  setTimeout(() => {
    const container = document.getElementById('mapa-fp-container');
    if (!container) return;
    if (L_map) { L_map.remove(); }
    const lat = parseFloat(b.latitude);
    const lng = parseFloat(b.longitude);
    L_map = window.L.map(container).setView([lat, lng], 16);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(L_map);
    window.L.marker([lat, lng]).addTo(L_map);
    setTimeout(() => { if (L_map) L_map.invalidateSize(); }, 200);
  }, 500);
}

// Batidas do dia
const modalBatidas     = ref(false);
const batidasDia       = ref('');
const batidasDtStr     = ref('');
const batidasLista     = ref([]);
const carregandoBatidas = ref(false);
const novaBatidaTipo   = ref('entrada');
const novaBatidaHora   = ref('');
const adicionandoBatida = ref(false);

function tipoBaseBatida(t) { return t.replace('_manual', ''); }

async function abrirBatidas(d) {
  batidasDtStr.value = d.dtStr;
  batidasDia.value   = new Date(d.dtStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  novaBatidaTipo.value = 'entrada';
  novaBatidaHora.value = '';
  modalBatidas.value   = true;
  await recarregarBatidas();
}

async function recarregarBatidas() {
  carregandoBatidas.value = true;
  const { data } = await supabase
    .from('registro_ponto')
    .select('*')
    .eq('funcionario_pk', funcSelecionado.value.pk)
    .eq('data', batidasDtStr.value)
    .order('hora');
  batidasLista.value     = data || [];
  carregandoBatidas.value = false;
}

async function adicionarBatida() {
  if (!novaBatidaHora.value) return;
  adicionandoBatida.value = true;
  try {
    const { error } = await supabase.from('registro_ponto').insert({
      filial_pk:      sessao.filial?.pk || null,
      funcionario_pk: funcSelecionado.value.pk,
      matricula:      funcSelecionado.value.matricula || '',
      tipo:           novaBatidaTipo.value + '_manual',
      data:           batidasDtStr.value,
      hora:           novaBatidaHora.value + ':00',
      latitude:       null,
      longitude:      null,
    });
    if (error) throw error;
    novaBatidaHora.value = '';
    await recarregarBatidas();
    await carregar();
  } catch (e) {
    toast('Erro ao adicionar: ' + e.message, 'err');
  } finally {
    adicionandoBatida.value = false;
  }
}

async function removerBatida(b) {
  if (!confirm(`Remover batida de ${tipoBaseBatida(b.tipo)} às ${b.hora.substring(0, 5)}?`)) return;
  const { error } = await supabase.from('registro_ponto').delete().eq('pk', b.pk);
  if (error) { toast('Erro ao remover: ' + error.message, 'err'); return; }
  await recarregarBatidas();
  await carregar();
}

function fecharBatidas() { modalBatidas.value = false; }

// Justificativa
const modalJust   = ref(false);
const justDtStr   = ref('');
const justDia     = ref('');
const justTipo    = ref('Atestado Médico');
const justObs     = ref('');
const salvandoJust = ref(false);

// Toast
const toastMsg  = ref('');
const toastTipo = ref('ok');
let _toastTimer = null;
function toast(msg, tipo = 'ok', dur = 3500) {
  clearTimeout(_toastTimer);
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  _toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

// ── Computed financeiro ────────────────────────────────────────────────────
const extraNormalH  = computed(() => summaries.value.saldoMes >= 0 ? summaries.value.extraSecNormal / 3600 : 0);
const extraDomRawH  = computed(() => summaries.value.extraSecDomingo / 3600);
const extraDomValH  = computed(() => extraDomRawH.value * 2);
const extraTotalH   = computed(() => extraNormalH.value + extraDomValH.value);
const totalDescontos = computed(() => descontos.value.reduce((s, d) => s + d.valor, 0));

const salProp = computed(() => {
  const f = funcSelecionado.value;
  if (!f) return 0;
  if (f.diarista) {
    return summaries.value.diasPagos * (f.valor_diaria || 0);
  }
  const hourVal  = summaries.value.baseSalary / (summaries.value.horasFechamento || 120);
  const salBase  = summaries.value.baseSalary / 2;
  const valorFlt = (summaries.value.missingSec / 3600) * hourVal;
  return Math.max(0, salBase - valorFlt);
});

const labelProp = computed(() => {
  const f = funcSelecionado.value;
  if (!f) return '';
  if (f.diarista) {
    return `${summaries.value.diasPagos} dia(s) × ${fmt(f.valor_diaria || 0)}`;
  }
  const faltas = summaries.value.missingSec / 3600;
  return fmt(salProp.value) + (faltas > 0 ? ` (desconto ${faltas.toFixed(1)}h faltas)` : '');
});

const valorHoraBase = computed(() => {
  const f = funcSelecionado.value;
  if (!f) return 0;
  const horas = summaries.value.horasFechamento || 120;
  return summaries.value.baseSalary / horas;
});

const valorHoraNormal = computed(() => {
  const f = funcSelecionado.value;
  if (!f || f.diarista) return 0;
  return parseFloat((valorHoraBase.value * 1.6).toFixed(2));
});

const valorHoraDomingo = computed(() => {
  const f = funcSelecionado.value;
  if (!f || f.diarista) return 0;
  return parseFloat((valorHoraBase.value * 2.0).toFixed(2));
});

const totalOT = computed(() => {
  return (pagarHorasNormal.value * valorHoraNormal.value) + (pagarHorasDomingo.value * valorHoraDomingo.value);
});

const totalLiquido = computed(() => salProp.value + totalOT.value - totalDescontos.value);

const saldoFinal = computed(() => {
  const totalDescontar = pagarHorasNormal.value + (pagarHorasDomingo.value * 2);
  return (summaries.value.saldoAcum || 0) - totalDescontar;
});

// ── Validação de Limites ──────────────────────────────────────────────────
watch(pagarHorasNormal, (val) => {
  if (val > extraNormalH.value) {
    pagarHorasNormal.value = parseFloat(extraNormalH.value.toFixed(2));
    toast('Limite de horas extras normais excedido.', 'err');
  }
});

watch(pagarHorasDomingo, (val) => {
  if (val > extraDomRawH.value) {
    pagarHorasDomingo.value = parseFloat(extraDomRawH.value.toFixed(2));
    toast('Limite de horas extras de domingo excedido.', 'err');
  }
});

// ── Utils ──────────────────────────────────────────────────────────────────
function timeToSec(t) { const [h, m] = t.split(':'); return +h * 3600 + +m * 60; }
function formatSec(s) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}h${String(m).padStart(2,'0')}`; }
function fmtH(v)  { return (v || 0).toFixed(2) + 'h'; }
function fmt(v)   { return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0); }
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ── Carregar lista ─────────────────────────────────────────────────────────
async function carregarLista() {
  carregandoLista.value = true;
  try {
    let q = supabase.from('funcionarios').select('*').eq('ativo', true).order('nome');
    if (sessao.filial?.pk) q = q.or(`filial_pk.eq.${sessao.filial.pk},filial_pk.is.null`);
    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];
    await carregarUltimosFechamentos(data || []);
  } catch (e) {
    toast('Erro ao carregar: ' + e.message, 'err');
  } finally {
    carregandoLista.value = false;
  }
}

async function carregarUltimosFechamentos(funcs) {
  if (!funcs.length) return;
  const pks = funcs.map(f => f.pk);
  const { data } = await supabase
    .from('fechamento_ponto')
    .select('funcionario_pk, mes, ano, quinzena, bloqueado')
    .in('funcionario_pk', pks)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .order('quinzena', { ascending: false });
  if (!data) return;
  const map = {};
  data.forEach(r => {
    if (!map[r.funcionario_pk]) {
      const q = r.quinzena === 1 ? '1ª Qnz' : '2ª Qnz';
      map[r.funcionario_pk] = `${q} ${meses[r.mes - 1].substring(0,3)}/${r.ano}${r.bloqueado ? ' 🔒' : ''}`;
    }
  });
  ultimosFech.value = map;
}

// ── Selecionar funcionário ─────────────────────────────────────────────────
function selecionarFunc(f) {
  funcSelecionado.value = f;
  // Configura salário base e horas de fechamento
  if (f.diarista) {
    summaries.value.baseSalary      = f.valor_diaria || 0;
    summaries.value.horasFechamento = f.horas_fechamento || 0;
  } else {
    summaries.value.baseSalary      = f.salario_mensal || 0;
    summaries.value.horasFechamento = f.horas_fechamento > 0 ? f.horas_fechamento : 120;
  }
  pagarHorasNormal.value = 0;
  pagarHorasDomingo.value = 0;
  carregar();
}

function voltarLista() {
  funcSelecionado.value = null;
  carregarLista();
}

// ── Carregar fechamento do período ─────────────────────────────────────────
async function carregar() {
  if (!funcSelecionado.value) return;
  carregandoFech.value = true;

  const func = funcSelecionado.value;
  const q1   = quinzena.value, m1 = mes.value, a1 = ano.value;

  const diaIni  = q1 === 1 ? '01' : '16';
  const dataIni = `${a1}-${String(m1).padStart(2,'0')}-${diaIni}`;
  const dataFim = q1 === 1
    ? `${a1}-${String(m1).padStart(2,'0')}-15`
    : new Date(a1, m1, 0).toISOString().split('T')[0];

  // 1. Fechamento existente
  const { data: fch } = await supabase.from('fechamento_ponto')
    .select('*').eq('funcionario_pk', func.pk)
    .eq('mes', m1).eq('ano', a1).eq('quinzena', q1).maybeSingle();

  bloqueado.value     = fch?.bloqueado    ?? false;
  espelhoStatus.value = fch?.espelho_status ?? 'rascunho';
  espelhoObs.value    = fch?.espelho_observacao ?? '';
  fechPk.value        = fch?.pk ?? null;

  if (fch) {
    pagarHorasNormal.value = fch.qtd_horas_extras_normais || 0;
    pagarHorasDomingo.value = fch.qtd_horas_extras_domingo || 0;
    // Fallback para registros antigos que usavam apenas um campo
    if (!fch.qtd_horas_extras_normais && !fch.qtd_horas_extras_domingo && fch.qtd_horas_pagas) {
      pagarHorasNormal.value = fch.qtd_horas_pagas;
    }
  } else {
    pagarHorasNormal.value = 0;
    pagarHorasDomingo.value = 0;
  }

  // 2. Saldo anterior (quinzena anterior)
  const antQ = q1 === 1 ? 2 : 1;
  const antM = q1 === 1 ? (m1 === 1 ? 12 : m1 - 1) : m1;
  const antA = q1 === 1 ? (m1 === 1 ? a1 - 1 : a1) : a1;
  const { data: fchAnt } = await supabase.from('fechamento_ponto')
    .select('saldo_acumulado').eq('funcionario_pk', func.pk)
    .eq('mes', antM).eq('ano', antA).eq('quinzena', antQ).maybeSingle();
  summaries.value.saldoAnt = fchAnt?.saldo_acumulado ?? (func.saldo_inicial_banco || 0);

  // 3. Batidas e justificativas
  const [resP, resJ] = await Promise.all([
    supabase.from('registro_ponto').select('*').eq('funcionario_pk', func.pk)
      .gte('data', dataIni).lte('data', dataFim).order('data').order('hora'),
    supabase.from('justificativas_ponto').select('*').eq('funcionario_pk', func.pk)
      .gte('data', dataIni).lte('data', dataFim),
  ]);
  punches.value = resP.data || [];
  justs.value   = resJ.data || [];

  // 4. Descontos
  if (fch?.pk) {
    const { data: desc } = await supabase.from('descontos_fechamento').select('*').eq('fechamento_pk', fch.pk);
    descontos.value = desc || [];
  } else {
    descontos.value = [];
  }

  processar(a1, m1, q1, dataIni, dataFim);
  carregandoFech.value = false;
}

// ── Processar dias do período ──────────────────────────────────────────────
function processar(a1, m1, q1, dataIni, dataFim) {
  const func     = funcSelecionado.value;
  const cargaSec = (func.carga_horaria_diaria || 8) * 3600;
  const intSec   = (func.minutos_intervalo || 60) * 60;

  // Mapa de batidas por dia
  const diasMap = {};
  punches.value.forEach(p => {
    if (!diasMap[p.data]) diasMap[p.data] = [];
    diasMap[p.data].push(p.hora.substring(0, 5));
  });

  let prevTot = 0, trabTot = 0, missingSec = 0;
  let extraSecNormal = 0, extraSecDomingo = 0, diasPagos = 0;

  const dIni = new Date(dataIni + 'T00:00:00');
  const dFim = new Date(dataFim + 'T00:00:00');
  const dias = [];

  for (let dt = new Date(dIni); dt <= dFim; dt.setDate(dt.getDate() + 1)) {
    const dtStr    = dt.toISOString().split('T')[0];
    const isDomingo = dt.getDay() === 0;
    const dia      = dt.getDate();
    const dayName  = DAYS[dt.getDay()];

    const just = justs.value.find(j => j.data === dtStr) || null;
    const bats = diasMap[dtStr] || [];

    let previsto = (func.diarista || isDomingo) ? 0 : cargaSec;
    if (just || isDomingo) previsto = 0;

    let trabalhado = 0;
    if (bats.length >= 2) {
      let ent = timeToSec(bats[0]);
      let sai = timeToSec(bats[bats.length - 1]);

      // Resolve horários previstos — normaliza para HH:MM antes de converter
      const normTime = t => t ? String(t).trim().substring(0, 5) : null;
      let entPrev = normTime(func.hora_entrada) ? timeToSec(normTime(func.hora_entrada)) : null;
      let saiPrev = normTime(func.hora_saida)   ? timeToSec(normTime(func.hora_saida))   : null;

      // Fallback: deriva um pelo outro quando um deles é nulo
      if (entPrev === null && saiPrev !== null) entPrev = saiPrev - cargaSec - intSec;
      if (saiPrev === null && entPrev !== null) saiPrev = entPrev + cargaSec + intSec;

      // Tolerância 15 min entrada (CLT Art. 58 §1º): bateu antes → não gera extra antecipado
      if (entPrev !== null && ent < entPrev && (entPrev - ent) <= 900) ent = entPrev;

      // Tolerância 15 min saída: bateu depois dentro da janela → não gera extra de saída
      if (saiPrev !== null && sai > saiPrev && (sai - saiPrev) <= 900) sai = saiPrev;

      trabalhado = Math.max(0, sai - ent - intSec);
    }

    const diff = trabalhado - previsto;
    prevTot  += previsto;
    trabTot  += trabalhado;

    const isPaidJust = just && (just.tipo === 'Abono' || just.tipo === 'Atestado Médico');

    // Horas extras
    if (isDomingo && trabalhado > 0) {
      extraSecDomingo += trabalhado;
    } else if (diff > 0) {
      extraSecNormal += diff;
    }

    // Faltas mensalistas
    if (!func.diarista && !isDomingo && trabalhado < cargaSec) {
      if (!isPaidJust && !just) {
        missingSec += (cargaSec - trabalhado);
      }
    }

    // Dias pagos (diaristas): precisa ter trabalhado algum tempo (> 0) ou justificativa paga
    if (func.diarista && (isPaidJust || (bats.length >= 2 && trabalhado > 0))) diasPagos++;

    dias.push({ dtStr, dia, dayName, isDomingo, previsto, trabalhado, diff, batidas: bats, just });
  }

  diasPeriodo.value = dias;

  const saldoMes  = (trabTot - prevTot) / 3600;
  const saldoAcum = summaries.value.saldoAnt + saldoMes;

  summaries.value = {
    ...summaries.value,
    previsto: prevTot,
    trabalhado: trabTot,
    saldoMes,
    saldoAcum,
    missingSec,
    extraSecNormal,
    extraSecDomingo,
    extraSec: extraSecNormal + extraSecDomingo * 2,
    diasPagos,
  };
}

// ── Descontos ──────────────────────────────────────────────────────────────
function addDesconto() {
  if (!novoDescNome.value.trim() || !(novoDescVal.value > 0)) {
    toast('Informe o motivo e um valor válido.', 'err'); return;
  }
  descontos.value.push({ descricao: novoDescNome.value.trim(), valor: novoDescVal.value });
  novoDescNome.value = '';
  novoDescVal.value  = null;
}
function removerDesconto(i) { descontos.value.splice(i, 1); }
function recalcular() { /* computed já recalcula automaticamente */ }

function pagarTudoExtra() {
  if (extraTotalH.value <= 0) { toast('Nenhuma hora extra disponível.', 'err'); return; }
  pagarHorasNormal.value = parseFloat(extraNormalH.value.toFixed(2));
  pagarHorasDomingo.value = parseFloat(extraDomRawH.value.toFixed(2));
}
function pagarSoDomingo() {
  if (extraDomRawH.value <= 0) { toast('Nenhuma hora extra de domingo neste período.', 'err'); return; }
  pagarHorasNormal.value = 0;
  pagarHorasDomingo.value = parseFloat(extraDomRawH.value.toFixed(2));
}

// ── Justificativa ──────────────────────────────────────────────────────────
function abrirJustificativa(d) {
  justDtStr.value = d.dtStr;
  justDia.value   = `Referente ao dia ${new Date(d.dtStr + 'T00:00:00').toLocaleDateString('pt-BR')}`;
  justTipo.value  = d.just?.tipo || 'Atestado Médico';
  justObs.value   = d.just?.observacoes || '';
  modalJust.value = true;
}
function fecharJust() { modalJust.value = false; }

async function salvarJustificativa() {
  salvandoJust.value = true;
  try {
    if (!justTipo.value) {
      await supabase.from('justificativas_ponto').delete()
        .eq('funcionario_pk', funcSelecionado.value.pk).eq('data', justDtStr.value);
    } else {
      await supabase.from('justificativas_ponto').upsert({
        funcionario_pk: funcSelecionado.value.pk,
        filial_pk:      sessao.filial?.pk || null,
        data:           justDtStr.value,
        tipo:           justTipo.value,
        observacoes:    justObs.value,
      }, { onConflict: 'funcionario_pk, data' });
    }
    fecharJust();
    await carregar();
  } catch (e) {
    toast('Erro ao salvar justificativa: ' + e.message, 'err');
  } finally {
    salvandoJust.value = false;
  }
}

// ── Enviar espelho ─────────────────────────────────────────────────────────
async function enviarEspelho() {
  if (!confirm('Os dados do período serão enviados ao funcionário para revisão e aprovação. Continuar?')) return;
  salvando.value = true;
  try {
    const payload = buildPayload(saldoFinal.value, false, 'enviado', null, null);
    const { error } = await supabase.from('fechamento_ponto')
      .upsert(payload, { onConflict: 'funcionario_pk, mes, ano, quinzena' });
    if (error) throw error;
    toast('Espelho enviado para aprovação!');
    await carregar();
  } catch (e) {
    toast('Erro ao enviar espelho: ' + e.message, 'err', 6000);
  } finally {
    salvando.value = false;
  }
}

async function salvar() {
  if (espelhoStatus.value !== 'aprovado') {
    toast('Aguardando aprovação do espelho pelo funcionário.', 'err'); return;
  }
  if (!confirm('O período será bloqueado e o saldo final do banco de horas será carregado para o próximo período. Continuar?')) return;
  salvando.value = true;
  try {
    const payload = buildPayload(saldoFinal.value, true, espelhoStatus.value, espelhoObs.value, null);
    
    await apiClient.post('/api/ponto/fechamento', {
        payload,
        descontos: descontos.value
    });

    toast('Fechamento realizado e bloqueado!');
    await carregar();
    await carregarUltimosFechamentos(lista.value);
  } catch (e) {
    toast('Erro ao salvar: ' + (e.response?.data?.erro || e.message), 'err', 6000);
  } finally {
    salvando.value = false;
  }
}

function buildPayload(saldoFinal, isBloqueado, espStatus, espObs, espAprovadoEm) {
  return {
    filial_pk:           sessao.filial?.pk || null,
    funcionario_pk:      funcSelecionado.value.pk,
    mes:                 mes.value,
    ano:                 ano.value,
    quinzena:            quinzena.value,
    salario_base:        summaries.value.baseSalary,
    horas_previstas:     summaries.value.previsto / 3600,
    horas_trabalhadas:   summaries.value.trabalhado / 3600,
    saldo_anterior:      summaries.value.saldoAnt,
    saldo_mes:           summaries.value.saldoMes,
    saldo_acumulado:     saldoFinal,
    valor_horas_extras:  totalOT.value,
    qtd_horas_pagas:     pagarHorasNormal.value + (pagarHorasDomingo.value * 2), // Total descontado do banco
    qtd_horas_extras_normais: pagarHorasNormal.value,
    qtd_horas_extras_domingo: pagarHorasDomingo.value,
    valor_hora_extra_pago: valorHoraNormal.value, // Referência apenas
    valor_descontos:     totalDescontos.value,
    total_liquido:       totalLiquido.value,
    bloqueado:           isBloqueado,
    espelho_status:      espStatus,
    espelho_observacao:  espObs,
    espelho_aprovado_em: espAprovadoEm,
  };
}

// ── Desbloquear ────────────────────────────────────────────────────────────
async function desbloquear() {
  if (!confirm('Reabrir este período permitirá novas alterações. Continuar?')) return;
  const { error } = await supabase.from('fechamento_ponto')
    .update({ bloqueado: false })
    .eq('funcionario_pk', funcSelecionado.value.pk)
    .eq('mes', mes.value).eq('ano', ano.value).eq('quinzena', quinzena.value);
  if (error) { toast('Erro ao reabrir: ' + error.message, 'err'); return; }
  toast('Período reaberto.');
  await carregar();
}

onMounted(carregarLista);
</script>

<style scoped>
.fp-wrap { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }

/* Cabeçalho */
.fp-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.fp-title  { margin: 0; font-size: 1.4rem; font-weight: 700; color: var(--text); }
.fp-sub    { font-size: .8rem; color: var(--text2); }

.btn-voltar {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text2); font-size: .8rem; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.btn-voltar:hover { color: var(--text); border-color: #6366f1; }

/* Filtros */
.fp-filtros { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search-wrap { position: relative; display: flex; align-items: center; flex: 1; min-width: 200px; }
.search-ico  { position: absolute; left: 10px; color: var(--text2); pointer-events: none; }
.search-input { padding-left: 32px !important; }
.fp-input {
  width: 100%; padding: 8px 12px;
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: .875rem;
  outline: none; transition: border-color .15s;
}
.fp-input:focus { border-color: #6366f1; }
.fp-textarea { resize: vertical; min-height: 60px; font-family: inherit; }
.fp-select {
  padding: 8px 12px; background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: .875rem;
  outline: none; cursor: pointer;
}
.fp-select:focus { border-color: #6366f1; }

.filtro-tabs { display: flex; gap: 4px; }
.ftab {
  padding: 7px 14px; background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text2); font-size: .8rem; font-weight: 600;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.ftab:hover  { color: var(--text); border-color: #6366f1; }
.ftab.active { background: #6366f1; border-color: #6366f1; color: #fff; }

/* Período */
.periodo-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.spin-sm {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(99,102,241,.2); border-top-color: #6366f1;
  border-radius: 50%; animation: spin .7s linear infinite;
}

/* Alertas */
.alerta {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: 10px; font-size: .85rem; gap: 12px; flex-wrap: wrap;
}
.alerta-bloqueado      { background: #ecfdf5; border: 1px solid #10b981; color: #065f46; }
.alerta-espelho-enviado   { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
.alerta-espelho-aprovado  { background: #ecfdf5; border: 1px solid #10b981; color: #065f46; }
.alerta-espelho-rejeitado { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
.btn-reabrir {
  padding: 6px 14px; background: #10b981; border: none; border-radius: 8px;
  color: #fff; font-size: .78rem; font-weight: 700; cursor: pointer; white-space: nowrap;
}

/* Tabela lista */
.tabela-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.tabela { width: 100%; border-collapse: collapse; font-size: .875rem; }
.tabela thead th {
  padding: 11px 14px; background: var(--bg3);
  text-align: left; font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px;
  color: var(--text2); border-bottom: 2px solid var(--border); white-space: nowrap;
}
.tabela tbody td { padding: 12px 14px; border-bottom: 1px solid var(--border); color: var(--text); }
.tabela tbody tr:last-child td { border-bottom: none; }
.tabela tbody tr:hover td { background: var(--bg3); }
.tabela-rodape { padding: 10px 14px; font-size: .78rem; color: var(--text2); text-align: right; border-top: 1px solid var(--border); }

.fn-nome-cell { display: flex; align-items: center; gap: 10px; }
.fn-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff; font-weight: 700; font-size: .85rem;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.fn-nome  { display: block; font-weight: 600; font-size: .875rem; }
.fn-mat   { display: block; font-size: .72rem; color: var(--text2); }
.td-mono  { font-family: monospace; font-size: .82rem; }
.td-muted { color: var(--text2); }

.badge-tipo {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
}
.badge-tipo.mensalista { background: rgba(99,102,241,.12); color: #4338ca; border: 1px solid rgba(99,102,241,.25); }
.badge-tipo.diarista   { background: rgba(245,158,11,.12); color: #92400e; border: 1px solid rgba(245,158,11,.25); }

.btn-fechar {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: #6366f1; border: none; border-radius: 8px;
  color: #fff; font-size: .8rem; font-weight: 600; cursor: pointer;
  transition: opacity .15s; white-space: nowrap;
}
.btn-fechar:hover { opacity: .88; }

/* Layout fechamento */
.close-layout { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
@media (max-width: 1100px) { .close-layout { grid-template-columns: 1fr; } }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }

.stat-box {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 14px;
}
.stat-box-destaque { border-color: #6366f1; }
.stat-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text2); margin-bottom: 4px; }
.stat-val   { font-size: 1.05rem; font-weight: 800; font-family: monospace; color: var(--text); }
.pos { color: #10b981 !important; }
.neg { color: #ef4444 !important; }

/* Tabela de dias */
.tabela-dias .row-domingo td:first-child { color: #ea580c; font-weight: 700; }
.badge-dom {
  display: inline-block; background: #fff7ed; color: #ea580c;
  border: 1px solid #fdba74; border-radius: 12px;
  font-size: .65rem; font-weight: 700; padding: 1px 6px; margin-left: 4px;
}
.td-acoes { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }

.btn-just {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 5px; font-size: .72rem; font-weight: 600;
  background: var(--bg3); border: 1px solid var(--border); cursor: pointer; color: #6366f1;
  transition: all .15s; white-space: nowrap;
}
.btn-just:hover { background: rgba(99,102,241,.08); border-color: #6366f1; }
.btn-batidas { color: var(--text2); }
.btn-batidas:hover { color: #6366f1; border-color: #6366f1; background: rgba(99,102,241,.06); }

/* Modal batidas */
.modal-box-lg { max-width: 540px !important; }
.batidas-loading { display: flex; align-items: center; gap: 8px; color: var(--text2); font-size: .85rem; }
.batidas-vazio   { color: var(--text2); font-size: .85rem; font-style: italic; text-align: center; padding: 12px 0; }

.batidas-lista { display: flex; flex-direction: column; gap: 6px; }
.batida-item {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 8px; padding: 9px 12px;
}
.batida-item-left { display: flex; align-items: center; gap: 6px; flex: 1; }
.batida-hora { font-family: monospace; font-size: 1rem; font-weight: 700; color: var(--text); margin-left: auto; }
.btn-rm-batida {
  background: none; border: none; cursor: pointer;
  color: var(--text2); padding: 4px; border-radius: 5px;
  display: flex; align-items: center; transition: color .15s;
}
.btn-rm-batida:hover { color: #ef4444; }

.batidas-add-section {
  margin-top: 6px; padding-top: 14px; border-top: 1px solid var(--border);
}
.batidas-add-title {
  font-size: .72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; color: var(--text2); margin-bottom: 10px;
}
.batidas-add-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.btn-add-batida {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; background: #6366f1; border: none; border-radius: 8px;
  color: #fff; font-size: .82rem; font-weight: 600; cursor: pointer;
  transition: opacity .15s; white-space: nowrap;
}
.btn-add-batida:hover:not(:disabled) { opacity: .88; }
.btn-add-batida:disabled { opacity: .4; cursor: not-allowed; }

/* Painel financeiro */
.fin-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 16px;
  position: sticky; top: 16px;
}
.fin-title { font-size: .95rem; font-weight: 700; color: var(--text); margin: 0; }
.fin-row-group { display: flex; flex-direction: column; gap: 8px; }
.fin-stat { display: flex; justify-content: space-between; align-items: center; }
.fin-label { font-size: .75rem; color: var(--text2); }
.fin-val   { font-size: .9rem; font-weight: 700; color: var(--text); }

.extra-card {
  background: #fff7ed; border: 1.5px solid #fed7aa;
  border-radius: 10px; padding: 12px 14px;
}
[data-theme="dark"] .extra-card { background: #1c1000; border-color: #78350f; }
.extra-title { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #ea580c; margin-bottom: 8px; }
.extra-linha { display: flex; justify-content: space-between; font-size: .78rem; color: var(--text); padding: 3px 0; }
.extra-total { border-top: 1px solid #fed7aa; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: .82rem; }
[data-theme="dark"] .extra-total { border-color: #78350f; }

.fin-field { display: flex; flex-direction: column; gap: 5px; }
.fin-field label { font-size: .72rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; }
.fin-field small  { font-size: .68rem; color: var(--text2); }
.fin-field-row { display: flex; align-items: center; gap: 6px; }
.fin-input { width: 100px !important; text-align: right; }
.fin-unit  { font-size: .8rem; color: var(--text2); }
.extra-pay-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  background: var(--bg3); border: 1px solid var(--border);
  padding: 12px; border-radius: 10px; margin-top: 4px;
}
.extra-pay-item { display: flex; flex-direction: column; gap: 4px; }
.extra-pay-label { font-size: .62rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; }
.extra-pay-rate { font-size: .85rem; font-weight: 800; color: #6366f1; margin-bottom: 2px; }
.extra-pay-dom .extra-pay-rate { color: #ea580c; }
.extra-pay-actions { display: flex; gap: 8px; margin-top: 10px; }
.extra-pay-actions .btn-banco-acao { flex: 1; padding: 7px; }

.btn-banco-acao {
  padding: 5px 10px; font-size: .75rem; font-weight: 700;
  background: var(--bg3); border: 1px solid var(--border); border-radius: 7px;
  color: var(--text2); cursor: pointer; transition: all .15s;
}

.descontos-lista { display: flex; flex-direction: column; gap: 6px; }
.descontos-vazio { font-size: .75rem; color: var(--text2); font-style: italic; }
.desconto-item {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--bg3); padding: 6px 10px; border-radius: 7px;
  border: 1px solid var(--border); font-size: .8rem;
}
.desconto-item-right { display: flex; align-items: center; gap: 8px; }
.btn-rm-desc { background: none; border: none; cursor: pointer; color: #ef4444; font-size: 1rem; font-weight: 700; line-height: 1; }
.desconto-add { display: flex; gap: 6px; align-items: center; margin-top: 4px; }
.btn-add-desc {
  padding: 8px 14px; background: var(--bg3); border: 1px solid var(--border);
  border-radius: 8px; color: #6366f1; font-size: 1rem; font-weight: 700;
  cursor: pointer; transition: all .15s; flex-shrink: 0;
}
.btn-add-desc:hover { background: rgba(99,102,241,.08); border-color: #6366f1; }

.total-box {
  background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.25);
  border-radius: 10px; padding: 14px 16px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.total-box span   { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #6366f1; }
.total-box strong { font-size: 1.5rem; font-weight: 800; color: #4338ca; }
[data-theme="dark"] .total-box strong { color: #818cf8; }

.btn-espelho {
  width: 100%; padding: 10px; border-radius: 9px;
  background: #f59e0b; border: none; color: #fff; font-size: .875rem; font-weight: 700;
  cursor: pointer; transition: opacity .15s;
}
.btn-espelho:hover:not(:disabled) { opacity: .88; }
.btn-espelho:disabled { opacity: .4; cursor: not-allowed; }

.btn-salvar {
  width: 100%; padding: 12px; border-radius: 9px;
  background: #6366f1; border: none; color: #fff; font-size: .875rem; font-weight: 700;
  cursor: pointer; transition: opacity .15s; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-salvar:hover:not(:disabled) { opacity: .88; }
.btn-salvar:disabled { opacity: .35; cursor: not-allowed; }

/* Estado / Loading */
.estado-msg {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 60px 20px;
  color: var(--text2); font-size: .9rem;
}

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 440px;
  box-shadow: 0 24px 60px rgba(0,0,0,.4);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border);
}
.modal-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); }
.modal-close { background: none; border: none; color: var(--text2); font-size: 22px; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
.modal-close:hover { color: var(--text); }
.modal-date  { font-size: .82rem; color: var(--text2); margin-bottom: 4px; }
.modal-body  { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--border); }
.form-field  { display: flex; flex-direction: column; gap: 5px; }
.form-field label { font-size: .73rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; }
.modal-btn { flex: 1; padding: 10px; border-radius: 9px; font-size: .875rem; font-weight: 600; cursor: pointer; border: none; transition: opacity .15s; }
.modal-btn.cancel { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); }
.modal-btn.cancel:hover { color: var(--text); }
.modal-btn.save   { background: #6366f1; color: #fff; }
.modal-btn.save:hover:not(:disabled) { opacity: .88; }
.modal-btn.save:disabled { opacity: .4; cursor: not-allowed; }

.btn-ajustar-batidas {
  width: 100%; padding: 10px; border-radius: 9px;
  background: var(--bg3); border: 1px solid var(--border);
  color: var(--text2); font-size: .875rem; font-weight: 700;
  cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-ajustar-batidas:hover { border-color: #6366f1; color: #6366f1; }

.tabela-geral-batidas { width: 100%; border-collapse: collapse; }
.tabela-geral-batidas th { text-align: left; padding: 10px 15px; background: var(--bg3); font-size: .7rem; text-transform: uppercase; color: var(--text2); }
.tabela-geral-batidas td { padding: 10px 15px; border-bottom: 1px solid var(--border); font-size: .85rem; }
.badge-tipo-small { padding: 2px 6px; border-radius: 4px; font-size: .65rem; font-weight: 700; }
.badge-tipo-small.entrada { background: rgba(16,185,129,.1); color: #10b981; }
.badge-tipo-small.saida   { background: rgba(239,68,68,.1); color: #ef4444; }

.link-gps { display: flex; align-items: center; gap: 4px; color: #6366f1; text-decoration: none; font-weight: 600; font-size: .75rem; }
.link-gps:hover { text-decoration: underline; }
.link-modal-gps { margin-left: 8px; color: #6366f1; display: inline-flex; vertical-align: middle; }
.gps-cell { display: flex; align-items: center; gap: 8px; }

.td-muted { color: var(--text2); opacity: .7; }

/* Toast */
.fp-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  z-index: 10000; padding: 12px 22px; border-radius: 10px;
  font-size: .875rem; font-weight: 500; white-space: nowrap;
  pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.25);
}
.fp-toast.ok  { background: #052e16; color: #6ee7b7; border: 1px solid rgba(16,185,129,.3); }
.fp-toast.err { background: #1f0707; color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
.toast-enter-active { transition: all .25s ease; }
.toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Spinners */
.spin {
  width: 22px; height: 22px;
  border: 2px solid rgba(99,102,241,.2); border-top-color: #6366f1;
  border-radius: 50%; animation: spin .7s linear infinite;
}
.spin-xs {
  display: inline-block; width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .filtro-tabs { overflow-x: auto; }
  .tabela thead { display: none; }
  .tabela td { display: block; padding: 6px 14px; border: none; }
  .tabela td::before { content: attr(data-label); font-size: .65rem; color: var(--text2); display: block; text-transform: uppercase; }
  .tabela tr { border-bottom: 1px solid var(--border); }
}
</style>
