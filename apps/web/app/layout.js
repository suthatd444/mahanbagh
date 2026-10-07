"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
exports.metadata = {
    title: 'Mohan Bagh',
    description: 'Real estate broker hierarchy platform',
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <body>{children}</body>
    </html>);
}
