declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options?: { scope?: string; extras?: Record<string, unknown>; config_id?: string },
      ) => void;
    };
  }
}

export interface FBLoginResponse {
  status: string;
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
  };
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const appId = config.public.facebookAppId as string;

  console.log("[FB SDK] runtimeConfig.public:", JSON.stringify(config.public, null, 2));
  console.log("[FB SDK] facebookAppId:", appId);

  if (!appId) {
    console.warn("[FB SDK] facebookAppId is empty — FB SDK will NOT load. Check NUXT_PUBLIC_FACEBOOK_APP_ID in .env");
    return { provide: { fb: null } };
  }

  console.log("[FB SDK] Loading Facebook SDK with appId:", appId);

  const ready = new Promise<typeof window.FB>((resolve) => {
    if (typeof window !== "undefined" && window.FB) {
      resolve(window.FB);
      return;
    }

    window.fbAsyncInit = () => {
      console.log("[FB SDK] fbAsyncInit fired — initializing FB.init()");
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      console.log("[FB SDK] FB.init() complete");
      resolve(window.FB);
    };

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.head.appendChild(script);
  });

  return {
    provide: {
      fb: {
        ready,
        login: async (options?: { scope?: string; extras?: Record<string, unknown>; config_id?: string }) => {
          const FB = await ready;
          return new Promise<FBLoginResponse>((resolve) => {
            FB.login((response) => resolve(response), options);
          });
        },
      },
    },
  };
});
