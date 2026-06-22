import "../src/styles.css";

export const metadata = {
  title: "草帽女孩溫柏淳",
  description: "街頭藝人草帽女孩溫柏淳的演出、教學與評審履歷網站"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
