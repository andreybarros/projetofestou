<template>
  <div class="cp-page">

    <div v-if="carregando" class="cp-loading">
      <div class="cp-spin"></div>
      <p>Carregando catálogo…</p>
    </div>

    <div v-else-if="erro" class="cp-erro">
      <span class="cp-erro-ico">😕</span>
      <h2>{{ erro }}</h2>
      <p>Verifique o link ou entre em contato com a loja.</p>
    </div>

    <template v-else>
      <!-- Header da loja -->
      <header class="cp-header">
        <div class="cp-header-inner">
          <img src="/img/logo_fundo_transp.png" alt="BarroStock" class="cp-logo" />
          <div class="cp-header-info">
            <h1 class="cp-catalogo-nome">{{ catalogo.nome }}</h1>
            <p v-if="catalogo.descricao" class="cp-catalogo-desc">{{ catalogo.descricao }}</p>
          </div>
          <!-- Busca no header -->
          <div class="cp-header-busca">
            <span class="material-symbols-outlined cp-busca-ico">search</span>
            <input
              v-model="busca"
              type="search"
              class="cp-busca-input"
              placeholder="Buscar produto…"
            />
            <button v-if="busca" class="cp-busca-clear" @click="busca = ''">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <button class="cp-cart-btn" @click="mostrarCarrinho = !mostrarCarrinho">
            <span class="material-symbols-outlined">shopping_bag</span>
            <span v-if="totalItens" class="cp-cart-badge">{{ totalItens }}</span>
          </button>
        </div>
      </header>

      <div class="cp-body">
        <!-- Grid de produtos -->
        <main class="cp-produtos">
          <div v-if="!produtos.length" class="cp-vazio">
            <span style="font-size:48px">📦</span>
            <p>Nenhum produto disponível no momento.</p>
          </div>
          <div v-else class="cp-grid">
            <div v-for="p in produtosVisiveis" :key="p.pk" class="cp-card">
              <div class="cp-card-foto" :class="p.foto_url ? 'cp-card-foto--clicavel' : ''" @click.stop="p.foto_url && abrirFoto(p)">
                <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" loading="lazy" />
                <div v-else class="cp-card-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
                <div v-if="p.foto_url" class="cp-foto-lupa">
                  <span class="material-symbols-outlined">zoom_in</span>
                </div>
              </div>
              <div class="cp-card-body">
                <div class="cp-card-nome">{{ p.descricao }}</div>
                <div v-if="p.codigo" class="cp-card-cod">Ref: {{ p.codigo }}</div>
              </div>
              <div class="cp-card-footer">
                <div class="cp-qty-ctrl">
                  <button class="cp-qty-btn" @click="decrementar(p)">−</button>
                  <span class="cp-qty-val">{{ quantidade(p.pk) }}</span>
                  <button
                    class="cp-qty-btn"
                    :disabled="p.saldo != null && quantidade(p.pk) >= p.saldo"
                    @click="incrementar(p)"
                  >+</button>
                </div>
                <div class="cp-card-footer-right">
                  <button
                    :class="['cp-add-btn', noCarrinho(p.pk) ? 'cp-add-btn--in' : '', p.saldo === 0 ? 'cp-add-btn--off' : '']"
                    :disabled="p.saldo === 0"
                    @click="toggleCarrinho(p)"
                  >
                    <span class="material-symbols-outlined">
                      {{ p.saldo === 0 ? 'block' : noCarrinho(p.pk) ? 'check' : 'add_shopping_cart' }}
                    </span>
                    {{ p.saldo === 0 ? 'Indisponível' : noCarrinho(p.pk) ? 'Adicionado' : 'Adicionar' }}
                  </button>
                  <div v-if="p.saldo != null && p.saldo > 0" class="cp-saldo-hint">
                    {{ p.saldo }} disponível
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ver mais -->
          <div v-if="temMais" class="cp-ver-mais">
            <button class="cp-ver-mais-btn" @click="verMais">
              <span class="material-symbols-outlined">expand_more</span>
              Ver mais produtos ({{ produtos.length - visiveis }} restantes)
            </button>
          </div>
        </main>

        <!-- Sidebar do carrinho (desktop) -->
        <aside class="cp-sidebar">
          <div class="cp-sidebar-inner">
            <h3 class="cp-sidebar-title">
              <span class="material-symbols-outlined">shopping_bag</span>
              Meu Pedido
            </h3>
            <div v-if="!carrinho.length" class="cp-sidebar-vazio">
              Adicione produtos ao pedido
            </div>
            <div v-else class="cp-sidebar-itens">
              <div v-for="item in carrinho" :key="item.pk" class="cp-sidebar-item">
                <div class="cp-sidebar-item-info">
                  <span class="cp-sidebar-item-nome">{{ item.descricao }}</span>
                  <span class="cp-sidebar-item-qty">{{ item.quantidade }}×</span>
                </div>
                <button class="cp-sidebar-rem" @click="removerDoCarrinho(item.pk)">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div v-if="carrinho.length" class="cp-form">
              <h4 class="cp-form-title">Seus dados</h4>
              <div class="cp-form-field">
                <label>Nome *</label>
                <input v-model="form.nome" type="text" placeholder="Seu nome completo" class="cp-input" />
              </div>
              <div class="cp-form-field">
                <label>WhatsApp / Telefone</label>
                <input v-model="form.telefone" type="tel" placeholder="(92) 99999-9999" class="cp-input" />
              </div>
              <div class="cp-form-field">
                <label>E-mail</label>
                <input v-model="form.email" type="email" placeholder="seu@email.com" class="cp-input" />
              </div>
              <div class="cp-form-row">
                <div class="cp-form-field">
                  <label>Data do Evento</label>
                  <input v-model="form.data_evento" type="date" class="cp-input" />
                </div>
                <div class="cp-form-field">
                  <label>Horário do Evento</label>
                  <input v-model="form.hora_evento" type="time" class="cp-input" />
                </div>
              </div>
              <div class="cp-form-field">
                <label>Como prefere receber?</label>
                <div class="cp-radio-group">
                  <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'retirada' }">
                    <input type="radio" v-model="form.tipo_entrega" value="retirada" />
                    <span class="material-symbols-outlined">store</span>
                    Retirar na loja
                  </label>
                  <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'entrega' }">
                    <input type="radio" v-model="form.tipo_entrega" value="entrega" />
                    <span class="material-symbols-outlined">local_shipping</span>
                    Quero entrega
                  </label>
                </div>
              </div>
              <div v-if="form.tipo_entrega === 'entrega'" class="cp-form-field">
                <label>Endereço do Evento *</label>
                <input v-model="form.endereco_evento" type="text" class="cp-input" placeholder="Rua, número, bairro, cidade…" />
              </div>
              <div class="cp-form-field">
                <label>Observações</label>
                <textarea v-model="form.obs" class="cp-input cp-textarea" rows="2" placeholder="Detalhes adicionais…"></textarea>
              </div>
              <div v-if="formErro" class="cp-form-erro">{{ formErro }}</div>
              <button class="cp-enviar-btn" :disabled="enviando" @click="enviarPedido">
                <span v-if="enviando" class="cp-spin-sm"></span>
                <span v-else class="material-symbols-outlined">send</span>
                {{ enviando ? 'Enviando…' : 'Solicitar Orçamento' }}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <!-- Carrinho mobile (drawer) -->
      <Transition name="drawer">
        <div v-if="mostrarCarrinho" class="cp-drawer-overlay" @click.self="mostrarCarrinho = false">
          <div class="cp-drawer">
            <div class="cp-drawer-header">
              <h3>Meu Pedido</h3>
              <button @click="mostrarCarrinho = false" class="cp-drawer-close">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="cp-drawer-body">
              <div v-if="!carrinho.length" class="cp-sidebar-vazio">
                Adicione produtos ao pedido
              </div>
              <div v-else>
                <div v-for="item in carrinho" :key="item.pk" class="cp-sidebar-item">
                  <div class="cp-sidebar-item-info">
                    <span class="cp-sidebar-item-nome">{{ item.descricao }}</span>
                    <span class="cp-sidebar-item-qty">{{ item.quantidade }}×</span>
                  </div>
                  <button class="cp-sidebar-rem" @click="removerDoCarrinho(item.pk)">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div class="cp-form" style="margin-top:16px">
                  <h4 class="cp-form-title">Seus dados</h4>
                  <div class="cp-form-field">
                    <label>Nome *</label>
                    <input v-model="form.nome" type="text" placeholder="Seu nome completo" class="cp-input" />
                  </div>
                  <div class="cp-form-field">
                    <label>WhatsApp / Telefone</label>
                    <input v-model="form.telefone" type="tel" placeholder="(92) 99999-9999" class="cp-input" />
                  </div>
                  <div class="cp-form-field">
                    <label>E-mail</label>
                    <input v-model="form.email" type="email" placeholder="seu@email.com" class="cp-input" />
                  </div>
                  <div class="cp-form-row">
                    <div class="cp-form-field">
                      <label>Data do Evento</label>
                      <input v-model="form.data_evento" type="date" class="cp-input" />
                    </div>
                    <div class="cp-form-field">
                      <label>Horário</label>
                      <input v-model="form.hora_evento" type="time" class="cp-input" />
                    </div>
                  </div>
                  <div class="cp-form-field">
                    <label>Como prefere receber?</label>
                    <div class="cp-radio-group">
                      <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'retirada' }">
                        <input type="radio" v-model="form.tipo_entrega" value="retirada" />
                        <span class="material-symbols-outlined">store</span>
                        Retirar na loja
                      </label>
                      <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'entrega' }">
                        <input type="radio" v-model="form.tipo_entrega" value="entrega" />
                        <span class="material-symbols-outlined">local_shipping</span>
                        Quero entrega
                      </label>
                    </div>
                  </div>
                  <div v-if="form.tipo_entrega === 'entrega'" class="cp-form-field">
                    <label>Endereço do Evento *</label>
                    <input v-model="form.endereco_evento" type="text" class="cp-input" placeholder="Rua, número, bairro…" />
                  </div>
                  <div class="cp-form-field">
                    <label>Observações</label>
                    <textarea v-model="form.obs" class="cp-input cp-textarea" rows="2" placeholder="Detalhes adicionais…"></textarea>
                  </div>
                  <div v-if="formErro" class="cp-form-erro">{{ formErro }}</div>
                  <button class="cp-enviar-btn" :disabled="enviando" @click="enviarPedido">
                    <span v-if="enviando" class="cp-spin-sm"></span>
                    <span v-else class="material-symbols-outlined">send</span>
                    {{ enviando ? 'Enviando…' : 'Solicitar Orçamento' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Lightbox foto -->
      <Transition name="fade">
        <div v-if="fotoLightbox" class="cp-lightbox" @click="fotoLightbox = null">
          <button class="cp-lightbox-close" @click="fotoLightbox = null">
            <span class="material-symbols-outlined">close</span>
          </button>
          <img :src="fotoLightbox.url" :alt="fotoLightbox.nome" class="cp-lightbox-img" @click.stop />
          <div class="cp-lightbox-nome">{{ fotoLightbox.nome }}</div>
        </div>
      </Transition>

      <!-- Tela de sucesso -->
      <Transition name="fade">
        <div v-if="enviado" class="cp-sucesso-overlay">
          <div class="cp-sucesso-box">
            <div class="cp-sucesso-ico">🎉</div>
            <h2>Pedido enviado!</h2>
            <p>Recebemos sua solicitação. Quando o orçamento estiver pronto, você poderá aprová-lo pelo link abaixo:</p>
            <div v-if="pedidoToken" class="cp-link-box">
              <input :value="linkOrcamento()" readonly class="cp-link-input" />
              <button class="cp-link-copy" @click="copiarLinkOrcamento" title="Copiar link">
                <span class="material-symbols-outlined">content_copy</span>
              </button>
            </div>
            <p class="cp-link-hint">Guarde esse link para acompanhar e aprovar seu orçamento.</p>
            <button class="cp-enviar-btn" style="margin-top:8px" @click="reiniciar">Fazer novo pedido</button>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route   = useRoute();
const token   = route.params.token;

const carregando      = ref(true);
const erro            = ref('');
const catalogo        = ref(null);
const produtos         = ref([]);
const busca            = ref('');
const visiveis         = ref(24);

const produtosFiltrados = computed(() => {
  if (!busca.value.trim()) return produtos.value;
  const q = busca.value.toLowerCase();
  return produtos.value.filter(p =>
    p.descricao?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q)
  );
});
const produtosVisiveis = computed(() => produtosFiltrados.value.slice(0, visiveis.value));
const temMais          = computed(() => visiveis.value < produtosFiltrados.value.length);
function verMais() { visiveis.value = Math.min(visiveis.value + 24, produtosFiltrados.value.length); }

watch(busca, () => { visiveis.value = 24; });
const carrinho        = ref([]); // [{ pk, descricao, foto_url, quantidade }]
const mostrarCarrinho = ref(false);
const enviando        = ref(false);
const enviado         = ref(false);
const pedidoToken     = ref('');
const formErro        = ref('');
const form = ref({ nome: '', telefone: '', email: '', obs: '', data_evento: '', hora_evento: '', tipo_entrega: 'retirada', endereco_evento: '' });
const fotoLightbox = ref(null);

function abrirFoto(p) {
  fotoLightbox.value = { url: p.foto_url, nome: p.descricao };
}

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/catalogo-publico/${token}`);
    catalogo.value = data.catalogo;
    produtos.value = data.produtos || [];
  } catch (e) {
    erro.value = e.response?.data?.erro || 'Catálogo não encontrado';
  } finally {
    carregando.value = false;
  }
});

const totalItens = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0));

function quantidade(pk) {
  return carrinho.value.find(i => i.pk === pk)?.quantidade || 0;
}
function noCarrinho(pk) { return carrinho.value.some(i => i.pk === pk); }

function incrementar(p) {
  const saldoMax = p.saldo != null ? parseInt(p.saldo, 10) : Infinity;
  const item = carrinho.value.find(i => i.pk === p.pk);
  if (item) {
    if (item.quantidade >= saldoMax) return; // já no limite do estoque
    item.quantidade++;
  } else {
    if (saldoMax <= 0) return;
    carrinho.value.push({ ...p, quantidade: 1 });
  }
}
function decrementar(p) {
  const idx = carrinho.value.findIndex(i => i.pk === p.pk);
  if (idx === -1) return;
  if (carrinho.value[idx].quantidade <= 1) carrinho.value.splice(idx, 1);
  else carrinho.value[idx].quantidade--;
}
function toggleCarrinho(p) {
  if (noCarrinho(p.pk)) removerDoCarrinho(p.pk);
  else incrementar(p);
}
function removerDoCarrinho(pk) {
  carrinho.value = carrinho.value.filter(i => i.pk !== pk);
}

async function enviarPedido() {
  formErro.value = '';
  if (!form.value.nome?.trim()) { formErro.value = 'Informe seu nome.'; return; }
  if (!carrinho.value.length)   { formErro.value = 'Adicione ao menos um produto.'; return; }
  if (form.value.tipo_entrega === 'entrega' && !form.value.endereco_evento?.trim()) {
    formErro.value = 'Informe o endereço do evento para entrega.'; return;
  }
  enviando.value = true;
  try {
    const { data } = await axios.post(`/api/catalogo-publico/${token}/pedido`, {
      nome_cliente:    form.value.nome,
      telefone:        form.value.telefone        || null,
      email:           form.value.email           || null,
      observacao:      form.value.obs             || null,
      data_evento:     form.value.data_evento     || null,
      hora_evento:     form.value.hora_evento     || null,
      tipo_entrega:    form.value.tipo_entrega,
      endereco_evento: form.value.endereco_evento || null,
      itens: carrinho.value.map(i => ({
        produto_pk: i.pk,
        nome:       i.descricao,
        quantidade: i.quantidade,
      })),
    });
    pedidoToken.value = data.pedido_token || '';
    enviado.value = true;
    mostrarCarrinho.value = false;
  } catch (e) {
    formErro.value = e.response?.data?.erro || 'Erro ao enviar. Tente novamente.';
  } finally {
    enviando.value = false;
  }
}

function reiniciar() {
  carrinho.value = [];
  form.value = { nome: '', telefone: '', email: '', obs: '', data_evento: '', hora_evento: '', tipo_entrega: 'retirada', endereco_evento: '' };
  pedidoToken.value = '';
  enviado.value = false;
}

function linkOrcamento() {
  return `${window.location.origin}/orcamento/${pedidoToken.value}`;
}

function copiarLinkOrcamento() {
  navigator.clipboard.writeText(linkOrcamento());
}
</script>

<style scoped>
.cp-page { height: 100dvh; overflow-y: auto; background: #f8f9fa; font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #0f172a; }

/* Header — dark */
.cp-header { background: #111318; border-bottom: 1px solid rgba(255,255,255,.06); position: sticky; top: 0; z-index: 100; }
.cp-header-inner { max-width: 1200px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.cp-logo { height: 36px; object-fit: contain; }
.cp-header-info { flex: 0 0 auto; }
.cp-catalogo-nome { font-size: 16px; font-weight: 800; color: #fff; margin: 0; }
.cp-catalogo-desc { font-size: 11px; color: rgba(255,255,255,.5); margin: 2px 0 0; }

/* Busca no header */
.cp-header-busca  { flex: 1; min-width: 140px; position: relative; display: flex; align-items: center; }
.cp-busca-ico     { position: absolute; left: 11px; font-size: 18px; color: rgba(255,255,255,.4); pointer-events: none; }
.cp-busca-input   { width: 100%; padding: 8px 36px 8px 38px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; color: #fff; font-size: 13px; font-family: inherit; outline: none; transition: border-color .15s, background .15s; }
.cp-busca-input:focus { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.25); }
.cp-busca-input::placeholder { color: rgba(255,255,255,.35); }
.cp-busca-clear   { position: absolute; right: 8px; background: none; border: none; color: rgba(255,255,255,.4); cursor: pointer; display: flex; padding: 2px; }
.cp-busca-clear:hover { color: #fff; }
.cp-busca-clear .material-symbols-outlined { font-size: 16px; }

.cp-cart-btn { position: relative; width: 44px; height: 44px; background: #6366f1; border: none; border-radius: 12px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cp-cart-btn .material-symbols-outlined { font-size: 22px; }
.cp-cart-badge { position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #111318; }

/* Body layout */
.cp-body { max-width: 1200px; margin: 0 auto; padding: 24px 20px; display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }

/* Grid de produtos */
.cp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.cp-vazio { text-align: center; padding: 60px 20px; color: #6b7280; }
.cp-vazio p { margin-top: 12px; font-size: 15px; }
.cp-ver-mais { display: flex; justify-content: center; margin-top: 20px; }
.cp-ver-mais-btn { display: flex; align-items: center; gap: 8px; padding: 12px 28px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; color: #374151; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.cp-ver-mais-btn:hover { border-color: #6366f1; color: #6366f1; }
.cp-ver-mais-btn .material-symbols-outlined { font-size: 20px; }

.cp-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.07); transition: box-shadow .15s; display: flex; flex-direction: column; }
.cp-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.1); }
.cp-card-foto { height: 150px; background: #f3f4f6; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; }
.cp-card-foto img { width: 100%; height: 100%; object-fit: cover; }
.cp-card-foto--clicavel { cursor: zoom-in; }
.cp-card-foto--clicavel:hover .cp-foto-lupa { opacity: 1; }
.cp-foto-lupa { position: absolute; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
.cp-foto-lupa .material-symbols-outlined { font-size: 36px; color: #fff; }
.cp-card-avatar { font-size: 40px; font-weight: 800; color: #d1d5db; }
.cp-card-body { padding: 12px 12px 6px; flex: 1; }
.cp-card-nome { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3; }
.cp-card-cod  { font-size: 11px; color: #9ca3af; margin-top: 3px; }
.cp-card-footer { padding: 8px 12px 12px; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.cp-card-footer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.cp-saldo-hint { font-size: 10px; color: #9ca3af; font-weight: 500; }
.cp-qty-ctrl { display: flex; align-items: center; gap: 6px; }
.cp-qty-btn { width: 26px; height: 26px; border-radius: 7px; border: 1px solid #e5e7eb; background: #f9fafb; color: #374151; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; transition: all .12s; }
.cp-qty-btn:hover:not(:disabled) { background: #6366f1; color: #fff; border-color: #6366f1; }
.cp-qty-btn:disabled { opacity: .35; cursor: not-allowed; }
.cp-qty-val { font-size: 14px; font-weight: 700; min-width: 20px; text-align: center; }
.cp-add-btn { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: #6366f1; border: none; border-radius: 8px; color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; transition: background .15s; white-space: nowrap; }
.cp-add-btn:hover:not(:disabled) { background: #4f46e5; }
.cp-add-btn--in  { background: #16a34a; }
.cp-add-btn--in:hover:not(:disabled) { background: #15803d; }
.cp-add-btn--off { background: #9ca3af; cursor: not-allowed; }
.cp-add-btn:disabled { opacity: .65; cursor: not-allowed; }
.cp-add-btn .material-symbols-outlined { font-size: 14px; }

/* Sidebar */
.cp-sidebar { position: sticky; top: 62px; max-height: calc(100dvh - 78px); }
.cp-sidebar-inner { background: #fff; border-radius: 16px; border: 1px solid #e5e7eb; overflow-y: auto; max-height: calc(100dvh - 78px); }
.cp-sidebar-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #0f172a; padding: 16px 18px 14px; border-bottom: 1px solid #e5e7eb; margin: 0; }
.cp-sidebar-title .material-symbols-outlined { font-size: 20px; color: #6366f1; }
.cp-sidebar-vazio { padding: 24px 18px; text-align: center; color: #9ca3af; font-size: 13px; }
.cp-sidebar-itens { padding: 8px 0; max-height: 220px; overflow-y: auto; }
.cp-sidebar-item { display: flex; align-items: center; gap: 8px; padding: 8px 18px; border-bottom: 1px solid #f3f4f6; }
.cp-sidebar-item:last-child { border-bottom: none; }
.cp-sidebar-item-info { flex: 1; }
.cp-sidebar-item-nome { display: block; font-size: 12px; font-weight: 600; color: #0f172a; }
.cp-sidebar-item-qty  { font-size: 11px; color: #6b7280; }
.cp-sidebar-rem { background: none; border: none; color: #9ca3af; cursor: pointer; display: flex; padding: 2px; }
.cp-sidebar-rem:hover { color: #ef4444; }
.cp-sidebar-rem .material-symbols-outlined { font-size: 16px; }

/* Formulário */
.cp-form { padding: 14px 18px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 10px; }
.cp-form-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin: 0; }
.cp-form-field { display: flex; flex-direction: column; gap: 4px; }
.cp-form-field label { font-size: 11px; font-weight: 600; color: #374151; }
.cp-input { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; color: #0f172a; font-size: 13px; font-family: inherit; outline: none; background: #f9fafb; width: 100%; box-sizing: border-box; }
.cp-input:focus { border-color: #6366f1; background: #fff; }
.cp-textarea { resize: vertical; }
.cp-form-erro { color: #ef4444; font-size: 12px; }
.cp-enviar-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #6366f1; border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .15s; font-family: inherit; margin-top: 4px; }
.cp-enviar-btn:hover:not(:disabled) { background: #4f46e5; }
.cp-enviar-btn:disabled { opacity: .5; cursor: not-allowed; }
.cp-enviar-btn .material-symbols-outlined { font-size: 18px; }

/* Drawer mobile */
.cp-cart-btn { display: none; }
.cp-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 500; display: flex; justify-content: flex-end; }
.cp-drawer { width: 340px; max-width: 100%; background: #fff; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; }
.cp-drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; background: #fff; }
.cp-drawer-header h3 { font-size: 16px; font-weight: 700; margin: 0; }
.cp-drawer-close { background: none; border: none; cursor: pointer; color: #6b7280; display: flex; }
.cp-drawer-body { flex: 1; padding: 12px 18px; }

/* Loading / erro */
.cp-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; color: #6b7280; }
.cp-spin { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.cp-spin-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.cp-erro { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 12px; text-align: center; padding: 20px; color: #374151; }
.cp-erro-ico { font-size: 60px; }
.cp-erro h2  { font-size: 22px; font-weight: 700; margin: 0; }
.cp-erro p   { color: #6b7280; margin: 0; }

/* Sucesso */
.cp-sucesso-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.cp-sucesso-box { background: #fff; border-radius: 20px; padding: 40px 32px; max-width: 440px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.cp-sucesso-ico { font-size: 60px; }
.cp-sucesso-box h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
.cp-sucesso-box p  { color: #6b7280; font-size: 14px; margin: 0; }
.cp-link-box { display: flex; gap: 6px; width: 100%; }
.cp-link-input { flex: 1; padding: 9px 11px; border: 1px solid #e5e7eb; border-radius: 8px; color: #374151; font-size: 12px; background: #f9fafb; width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: text; }
.cp-link-copy { width: 38px; height: 38px; flex-shrink: 0; background: #6366f1; border: none; border-radius: 8px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cp-link-copy .material-symbols-outlined { font-size: 18px; }
.cp-link-hint { font-size: 12px; color: #9ca3af; margin: 0; }

/* Lightbox */
.cp-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.9); z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; cursor: zoom-out; }
.cp-lightbox-img  { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,.5); cursor: default; }
.cp-lightbox-nome { margin-top: 14px; color: rgba(255,255,255,.8); font-size: 14px; font-weight: 600; text-align: center; }
.cp-lightbox-close { position: absolute; top: 16px; right: 16px; width: 44px; height: 44px; background: rgba(255,255,255,.15); border: none; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 22px; transition: background .15s; }
.cp-lightbox-close:hover { background: rgba(255,255,255,.28); }
.cp-lightbox-close .material-symbols-outlined { font-size: 22px; }

/* Transitions */
.drawer-enter-active, .drawer-leave-active { transition: opacity .2s; }
.drawer-enter-active .cp-drawer, .drawer-leave-active .cp-drawer { transition: transform .25s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .cp-drawer, .drawer-leave-to .cp-drawer { transform: translateX(100%); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Responsive */
@media (max-width: 900px) {
  .cp-body    { grid-template-columns: 1fr; }
  .cp-sidebar { display: none; }
  .cp-cart-btn { display: flex; }
}
@media (max-width: 500px) {
  .cp-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
