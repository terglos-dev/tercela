<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('channels.addChannel')" icon="i-lucide-plus">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            to="/channels"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-2xl">
        <!-- Step 1: Login with Meta -->
        <template v-if="step === 'login' && !showManual">
          <div class="space-y-6">
            <UButton
              size="lg"
              color="primary"
              block
              icon="i-lucide-log-in"
              :label="metaLoading ? $t('channels.metaConnecting') : $t('channels.connectMeta')"
              :loading="metaLoading"
              :disabled="!hasFbSdk"
              @click="onMetaLogin"
            />

            <p v-if="!hasFbSdk" class="text-sm text-[var(--ui-text-dimmed)]">
              Facebook App ID not configured. Use manual setup below.
            </p>

            <div class="text-center">
              <UButton
                variant="link"
                color="neutral"
                :label="$t('channels.orManual')"
                @click="showManual = true"
              />
            </div>
          </div>
        </template>

        <!-- Step 2: Select phone number -->
        <template v-if="step === 'select'">
          <div class="space-y-6">
            <div class="flex items-center gap-2 mb-2">
              <UButton
                icon="i-lucide-arrow-left"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="step = 'login'"
              />
              <h3 class="text-lg font-medium">{{ $t('channels.selectNumber') }}</h3>
            </div>

            <div v-if="metaLoading" class="text-center py-8 text-[var(--ui-text-dimmed)]">
              {{ $t('channels.loadingAccounts') }}
            </div>

            <div v-else-if="wabaAccounts.length === 0" class="text-center py-8 text-[var(--ui-text-dimmed)]">
              {{ $t('channels.noAccountsFound') }}
            </div>

            <div v-else class="space-y-4">
              <div v-for="waba in wabaAccounts" :key="waba.id">
                <p class="text-sm font-medium text-[var(--ui-text-dimmed)] mb-2">{{ waba.name }}</p>
                <div class="space-y-2">
                  <div
                    v-for="phone in waba.phone_numbers"
                    :key="phone.id"
                    class="flex items-center justify-between p-3 border border-[var(--ui-border)] rounded-lg cursor-pointer hover:bg-[var(--ui-bg-elevated)] transition-colors"
                    :class="{ 'ring-2 ring-[var(--ui-primary)]': selectedPhone?.id === phone.id }"
                    @click="selectPhone(waba, phone)"
                  >
                    <div>
                      <p class="font-medium">{{ phone.verified_name }}</p>
                      <p class="text-sm text-[var(--ui-text-dimmed)]">{{ phone.display_phone_number }}</p>
                    </div>
                    <UBadge v-if="phone.quality_rating" :label="phone.quality_rating" variant="subtle" size="sm" />
                  </div>
                </div>
              </div>
            </div>

            <template v-if="selectedPhone">
              <UFormField :label="$t('channels.name')">
                <UInput
                  v-model="metaForm.name"
                  :placeholder="selectedPhone.verified_name"
                  class="w-full"
                />
              </UFormField>

              <UButton
                color="primary"
                block
                icon="i-lucide-check"
                :label="connecting ? $t('channels.metaConnecting') : $t('channels.connectNumber')"
                :loading="connecting"
                @click="onConnectSelected"
              />
            </template>
          </div>
        </template>

        <!-- Manual Setup (fallback) -->
        <template v-if="showManual">
          <div class="mb-4">
            <UButton
              variant="link"
              color="neutral"
              icon="i-lucide-arrow-left"
              :label="$t('channels.connectMeta')"
              @click="showManual = false"
            />
          </div>

          <form class="space-y-6" @submit.prevent="onSubmit">
            <UFormField :label="$t('channels.name')">
              <UInput
                v-model="form.name"
                :placeholder="$t('channels.namePlaceholder')"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('channels.type')">
              <USelect
                v-model="form.type"
                :items="channelTypes"
                class="w-full"
              />
            </UFormField>

            <template v-if="form.type === 'whatsapp'">
              <UFormField :label="$t('channels.whatsapp.phoneNumberId')">
                <UInput
                  v-model="form.config.phoneNumberId"
                  placeholder="123456789"
                  required
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('channels.whatsapp.accessToken')">
                <UInput
                  v-model="form.config.accessToken"
                  placeholder="EAAx..."
                  required
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('channels.whatsapp.appSecret')">
                <UInput
                  v-model="form.config.appSecret"
                  placeholder="abc123..."
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('channels.whatsapp.verifyToken')">
                <UInput
                  v-model="form.config.verifyToken"
                  placeholder="my-verify-token"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('channels.whatsapp.businessAccountId')">
                <UInput
                  v-model="form.config.businessAccountId"
                  placeholder="78910"
                  class="w-full"
                />
              </UFormField>
            </template>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :label="$t('channels.create')"
                icon="i-lucide-check"
                color="primary"
                :loading="submitting"
              />
            </div>
          </form>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { createChannel, fetchMetaAccounts, connectMeta } = useChannels();

const step = ref<"login" | "select">("login");
const submitting = ref(false);
const metaLoading = ref(false);
const connecting = ref(false);
const showManual = ref(false);
const hasFbSdk = ref(false);

// Meta OAuth token (kept in memory only, never persisted)
const metaAccessToken = ref("");

// WABA accounts + phone numbers fetched from Graph API
const wabaAccounts = ref<{
  id: string;
  name: string;
  phone_numbers: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[];
}[]>([]);

const selectedPhone = ref<{ id: string; display_phone_number: string; verified_name: string } | null>(null);
const selectedWabaId = ref("");

const metaForm = reactive({ name: "" });

onMounted(() => {
  const { $fb: fb } = useNuxtApp();
  console.log("[channels/new] onMounted $fb:", fb);
  hasFbSdk.value = !!fb;
});

const channelTypes = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Webchat (coming soon)", value: "webchat", disabled: true },
  { label: "Instagram (coming soon)", value: "instagram", disabled: true },
];

const form = reactive({
  name: "",
  type: "whatsapp",
  config: {
    phoneNumberId: "",
    accessToken: "",
    appSecret: "",
    verifyToken: "tercela-verify-token",
    businessAccountId: "",
  },
});

function selectPhone(waba: { id: string }, phone: { id: string; display_phone_number: string; verified_name: string }) {
  selectedPhone.value = phone;
  selectedWabaId.value = waba.id;
  metaForm.name = phone.verified_name;
}

async function onMetaLogin() {
  const { $fb } = useNuxtApp();
  if (!$fb) return;
  metaLoading.value = true;

  try {
    // Standard OAuth login — no Embedded Signup
    console.log("[channels/new] Calling FB.login() (standard OAuth)...");
    const response = await ($fb as { login: (opts: Record<string, unknown>) => Promise<{ status: string; authResponse?: { accessToken?: string } }> }).login({
      scope: "business_management,whatsapp_business_management,whatsapp_business_messaging",
    });

    console.log("[channels/new] FB.login response:", JSON.stringify(response));

    if (response.status !== "connected" || !response.authResponse?.accessToken) {
      console.warn("[channels/new] FB.login failed. status:", response.status);
      toast.add({ title: t("channels.metaError"), color: "error" });
      return;
    }

    metaAccessToken.value = response.authResponse.accessToken;
    console.log("[channels/new] Got access token, fetching accounts...");

    // Fetch WABAs and phone numbers via backend
    const accounts = await fetchMetaAccounts(metaAccessToken.value);
    console.log("[channels/new] Accounts:", JSON.stringify(accounts));

    wabaAccounts.value = accounts;
    step.value = "select";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("channels.metaError");
    console.error("[channels/new] Error:", message);
    toast.add({ title: message, color: "error" });
  } finally {
    metaLoading.value = false;
  }
}

async function onConnectSelected() {
  if (!selectedPhone.value || !selectedWabaId.value) return;
  connecting.value = true;

  try {
    console.log("[channels/new] Connecting phone:", selectedPhone.value.id, "WABA:", selectedWabaId.value);

    const result = await connectMeta({
      accessToken: metaAccessToken.value,
      phoneNumberId: selectedPhone.value.id,
      wabaId: selectedWabaId.value,
      name: metaForm.name || selectedPhone.value.verified_name,
    });

    console.log("[channels/new] Channel created:", JSON.stringify(result));
    toast.add({ title: t("channels.metaSuccess"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("channels.metaError");
    console.error("[channels/new] Connect error:", message);
    toast.add({ title: message, color: "error" });
  } finally {
    connecting.value = false;
  }
}

async function onSubmit() {
  submitting.value = true;
  try {
    await createChannel({
      type: form.type,
      name: form.name,
      config: { ...form.config },
    });
    toast.add({ title: t("channels.created"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create channel";
    toast.add({ title: message, color: "error" });
  } finally {
    submitting.value = false;
  }
}
</script>
