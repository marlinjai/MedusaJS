// Custom _error page to override Next.js default and fix React 19 RC SSR issues
// This prevents the "Cannot read properties of null (reading 'useContext')" error

function Error({ statusCode }: { statusCode?: number }) {
  return null; // Return null to avoid rendering during static generation
}

Error.getInitialProps = () => {
  return { statusCode: 404 };
};

export default Error;

