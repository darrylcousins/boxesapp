import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import {
  Provider as AppBridgeProvider,
  useAppBridge,
} from "@shopify/app-bridge-react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Link,
  List,
  Heading,
  AppProvider as PolarisProvider,
} from "@shopify/polaris";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Redirect } from "@shopify/app-bridge/actions";
import translations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { createElement, useState, setState, useEffect } from "react";

async function digestMessage(message) {
  const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
};

export default function App() {

  const [ sig, setSig ] = useState("");
  const [ ts, setTs ] = useState(new Date().getTime());

  const str = `${ts}.${process.env.SHOP}.${process.env.SHOPIFY_API_KEY}`;

  const getDigest = async () =>  {
    const data = await digestMessage(str);
    setSig(data);
  };

  useEffect(() => {
    getDigest();
  }, []);

  const base = `https://${process.env.SHOP}${process.env.PROXY_PATH}/`;

  return (
    <PolarisProvider i18n={translations}>
      <AppBridgeProvider
        config={{
          apiKey: process.env.SHOPIFY_API_KEY,
          host: new URL(location).searchParams.get("host"),
          forceRedirect: true,
        }}
      >
        <MyProvider>
          <Page fullWidth>
            <Layout>
              <Layout.Section>
                <Card sectioned>
                  <Stack
                    wrap={false}
                    spacing="extraTight"
                    distribution="trailing"
                    alignment="center"
                  >
                    <Stack.Item fill>
                      <TextContainer spacing="loose">
                        <Heading>Boxes</Heading>
                        <p>
                          Use the link to access the admin portal.
                        </p>
                      </TextContainer>
                    </Stack.Item>
                  </Stack>
                </Card>
              </Layout.Section>
              <Layout.Section secondary>
                <Card sectioned>
                  <TextContainer spacing="loose">
                      <List type="bullet">
                        <List.Item>
                          <Link url={ `${base}admin-portal?sig=${sig}&ts=${ts}` } external>
                            Admin Portal
                          </Link>
                        </List.Item>
                      </List>
                  </TextContainer>
                </Card>
              </Layout.Section>
            </Layout>
          </Page>
        </MyProvider>
      </AppBridgeProvider>
    </PolarisProvider>
  );
};

function MyProvider({ children }) {
  const app = useAppBridge();

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      credentials: "include",
      fetch: userLoggedInFetch(app),
    }),
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export function userLoggedInFetch(app) {
  const fetchFunction = authenticatedFetch(app);

  return async (uri, options) => {
    const response = await fetchFunction(uri, options);

    if (
      response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1"
    ) {
      const authUrlHeader = response.headers.get(
        "X-Shopify-API-Request-Failure-Reauthorize-Url"
      );

      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.APP, authUrlHeader || `/auth`);
      return null;
    };

    return response;
  };
};


