// DADOS GERADOS A PARTIR DOS PDFs REAIS (fitz/pymupdf) - topologia extraida 1:1.
// Arquivo gerado automaticamente - nao editar manualmente os valores.

export interface TTexto {
  t: string; size: number; bold: boolean; italic: boolean; red: boolean;
}
export interface TMapaNode {
  caixa: { x: number; y: number; w: number; h: number }; verde: boolean;
  linhas: TTexto[]; cx: number[]; by: number[];
}
export interface TMapaPainel {
  outer: { x: number; y: number; w: number; h: number };
  inner: { x: number; y: number; w: number; h: number };
  linhas: (TTexto & { x0: number; baseY: number })[];
}
export interface TMapaRotulo {
  t: string; size: number; bold: boolean; italic: boolean; red: boolean;
  x: number; baseY: number; angle: number;
}
export interface TRotaMapa {
  id: string; titulo: string; w: number; h: number;
  nodes: TMapaNode[]; paineis: TMapaPainel[];
  linhas: [number, number, number, number, number][];
  setas: { cor: string; pts: [number, number][] }[];
  vermelhas: [number, number, number, number][];
  rotulos: TMapaRotulo[];
}
export const ROTAS_MAPA: TRotaMapa[] = [
  {
    id: 'CGT',
    titulo: "I-BR-SP-CGT-CGU-HL4-01",
    w: 1523, h: 934,
    nodes: [
      { caixa: { x: 425.5, y: 102.6, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.PB", size: 15.17, bold: false, italic: false, red: false },
        { t: "huawei", size: 15.17, bold: false, italic: false, red: false },
      ], cx: [481.05, 481.08], by: [137.99, 155.99]},
      { caixa: { x: 690, y: 102.9, w: 111.3, h: 77.7 }, verde: false, linhas: [
        { t: "BERT.BT", size: 15.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 15.62, bold: false, italic: false, red: false },
      ], cx: [745.62, 745.65], by: [137.99, 156.74]},
      { caixa: { x: 944.7, y: 102.9, w: 111.3, h: 77.7 }, verde: false, linhas: [
        { t: "MCZ.JP", size: 15.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 15.62, bold: false, italic: false, red: false },
      ], cx: [1000.33, 1000.34], by: [137.99, 156.74]},
      { caixa: { x: 19.4, y: 103.1, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "CGT.AA", size: 15.62, bold: false, italic: false, red: false },
        { t: "1000", size: 15.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 15.62, bold: false, italic: false, red: false },
      ], cx: [75.06, 75.07, 75.07], by: [128.77, 147.52, 166.27]},
      { caixa: { x: 1178.7, y: 103.6, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "AUJ.AJ", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1234.29, 1234.31], by: [138.28, 159.28]},
      { caixa: { x: 1178.7, y: 246.9, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "1000", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1234.3, 1234.31, 1234.31], by: [271.11, 292.11, 313.11]},
      { caixa: { x: 1358.8, y: 302.9, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "1002", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1414.4, 1414.42], by: [337.62, 358.62]},
      { caixa: { x: 19.1, y: 312.3, w: 111.2, h: 77.7 }, verde: false, linhas: [
        { t: "CGT.AA", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "1002", size: 14.17, bold: false, italic: false, red: false },
      ], cx: [74.69, 74.72, 74.72], by: [338.45, 359.45, 377.14]},
      { caixa: { x: 19.1, y: 582.3, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "CGT.AA", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "1002", size: 14.17, bold: false, italic: false, red: false },
      ], cx: [74.69, 74.72, 74.72], by: [608.37, 629.37, 647.06]},
      { caixa: { x: 1367.1, y: 671.2, w: 111.3, h: 77.7 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "1002", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1422.74, 1422.76, 1422.76], by: [695.47, 716.47, 737.47]},
      { caixa: { x: 19.1, y: 791.5, w: 111.2, h: 77.7 }, verde: false, linhas: [
        { t: "CGT.AA", size: 14.17, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.17, bold: false, italic: false, red: false },
        { t: "0005", size: 14.17, bold: false, italic: false, red: false },
      ], cx: [74.7, 74.72, 74.72], by: [818.07, 835.32, 852.57]},
      { caixa: { x: 203, y: 791.5, w: 111.2, h: 77.7 }, verde: false, linhas: [
        { t: "UTB.TG", size: 15.62, bold: false, italic: false, red: false },
        { t: "0004", size: 15.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [250.06, 251.83, 258.61], by: [816.09, 834.84, 855.51]},
      { caixa: { x: 1168.9, y: 791.5, w: 111.2, h: 77.7 }, verde: false, linhas: [
        { t: "TTE.AM", size: 17.62, bold: false, italic: false, red: false },
        { t: "0002", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1224.44, 1224.47, 1224.47], by: [815.76, 836.76, 857.76]},
      { caixa: { x: 448.2, y: 793.4, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SLD.DC", size: 17.62, bold: false, italic: false, red: false },
        { t: "0001", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [503.8, 503.81, 503.81], by: [817.65, 838.65, 859.65]},
      { caixa: { x: 696.5, y: 793.4, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "TTE.BR", size: 17.62, bold: false, italic: false, red: false },
        { t: "0001", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [752.04, 752.07, 752.07], by: [817.65, 838.65, 859.65]},
      { caixa: { x: 944.7, y: 793.4, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "TTE.AM", size: 17.62, bold: false, italic: false, red: false },
        { t: "0004", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1000.3, 1000.34, 1000.34], by: [817.65, 838.65, 859.65]},
      { caixa: { x: 1367.1, y: 793.4, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "0010", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1422.74, 1422.76, 1422.76], by: [817.65, 838.65, 859.65]},
      { caixa: { x: 1258.8, y: 412.3, w: 254.6, h: 100.5 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HUM-", size: 22.79, bold: true, italic: false, red: false },
        { t: "HL3-01", size: 22.79, bold: true, italic: false, red: false },
      ], cx: [1386.11, 1386.12], by: [457.43, 484.43]},
      { caixa: { x: 19.1, y: 417, w: 254.6, h: 138.3 }, verde: true, linhas: [
        { t: "I-BR-SP-CGT-CGU", size: 21.79, bold: true, italic: false, red: false },
        { t: "HL4-01", size: 21.79, bold: true, italic: false, red: false },
      ], cx: [146.37, 146.4], by: [480.79, 507.04]},
      { caixa: { x: 1258.8, y: 544.6, w: 254.6, h: 100.4 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HUM-", size: 22.79, bold: true, italic: false, red: false },
        { t: "HL3-02", size: 22.79, bold: true, italic: false, red: false },
      ], cx: [1386.11, 1386.12], by: [589.68, 616.68]},
    ],
    paineis: [
      { outer: { x: 147.28, y: 246.89, w: 687.37, h: 160.59 }, inner: { x: 233.2, y: 246.89, w: 515.53, h: 160.59 }, linhas: [
        { t: "CGT.AA - SJC.RH GBE100 - 0001", size: 14, bold: true, italic: true, red: true, x0: 239.95, baseY: 266.38 },
        { t: "I-BR-SP-SJC-HUM-HL3-01 - 2/1/c33/1 <---> I-BR-SP-CGT-CGU-HL4-01", size: 14, bold: true, italic: true, red: false, x0: 239.95, baseY: 282.88 },
        { t: "100GE0/7/1", size: 14, bold: true, italic: true, red: false, x0: 239.95, baseY: 299.38 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 315.88 },
        { t: "CGT.AA :OTN OSN-9800U32(HUA)1 1002 - Canais - 5\u00b0A.TX/16A/ [031-040]", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 332.38 },
        { t: "/00 - TNV3T404C01 HUA(TNV3T404C01) //0005 - p.3 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 348.88 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 365.38 },
        { t: "/00 - T404 HUA(T404) //0002 - p.2 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 381.88 },
      ]},
      { outer: { x: 147.28, y: 578.29, w: 687.37, h: 160.6 }, inner: { x: 233.2, y: 578.29, w: 515.53, h: 160.6 }, linhas: [
        { t: "CGT.AA - SJC.RH GBE100 - 0002", size: 14, bold: true, italic: true, red: true, x0: 239.95, baseY: 597.78 },
        { t: "I-BR-SP-SJC-HUM-HL3-02 - 2/1/c10/1 <---> I-BR-SP-CGT-CGU-HL4-01", size: 14, bold: true, italic: true, red: false, x0: 239.95, baseY: 614.28 },
        { t: "100GE0/8/1", size: 14, bold: true, italic: true, red: false, x0: 239.95, baseY: 630.78 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 647.28 },
        { t: "CGT.AA :OTN OSN-9800U32(HUA)1 1002 - Canais - 5\u00b0A.TX/16A/ [031-040]", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 663.78 },
        { t: "/00 - T404 HUA(T404) //0020 - p.1 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 680.28 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 696.78 },
        { t: "/00 - T404 HUA(T404) //0017 - p.4 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 239.95, baseY: 713.28 },
      ]},
    ],
    linhas: [
      [74.7, 390, 74.1, 418.4, 1.3],
      [74.7, 312.3, 75.1, 180.7, 1.3],
      [1234.3, 246.9, 1234.3, 246.9, 0.75],
      [1413.2, 381.2, 1414, 412.5, 0.75],
      [74.7, 659.9, 74.7, 791.5, 0.75],
      [130.3, 830.3, 203, 830.3, 0.75],
      [314.2, 830.3, 448.2, 832.2, 0.75],
      [559.4, 832.2, 696.5, 832.2, 0.75],
      [807.7, 832.2, 944.7, 832.2, 0.75],
      [1056, 832.2, 1367.1, 832.2, 0.75],
      [1422.1, 794.4, 1422.8, 748.9, 0.75],
      [74.6, 555.5, 74.7, 582.3, 0.75],
      [1422.8, 671.2, 1422.5, 644.9, 0.75],
      [130.7, 141.9, 425.5, 141.4, 0.75],
      [536.7, 141.4, 690, 141.8, 0.75],
      [801.3, 141.7, 944.7, 141.7, 0.75],
      [1056, 141.7, 1178.7, 142.4, 0.75],
      [1234.3, 324.5, 1358.8, 341.7, 0.75],
      [1234.3, 181.2, 1234.3, 246.9, 0.75],
      [1234.3, 181.2, 1234.3, 242.4, 0.75],
      [130.7, 141.9, 1178.7, 285.7, 0.75],
    ],
    setas: [
      { cor: '#000000', pts: [[1233.07, 242.4], [1234.3, 245.8], [1235.54, 242.4]] },
      { cor: '#ff0000', pts: [[1174.07, 286.32], [1177.61, 285.56], [1174.41, 283.87]] },
    ],
    vermelhas: [
      [130.7, 141.9, 1174.2, 285.1],
    ],
    rotulos: [
      { t: "TRONCO 172 RAMAN", size: 14, bold: true, italic: false, red: false, x: 694.04, baseY: 206.23, angle: 8.74 },
      { t: "2 vias", size: 19, bold: true, italic: false, red: false, x: 135.42, baseY: 137, angle: 0 },
    ],
  },
  {
    id: 'S2B',
    titulo: "I-BR-SP-SST-S2B-HL4-01  BORACEIA",
    w: 1750, h: 1048,
    nodes: [
      { caixa: { x: 166.4, y: 104.9, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "MRES.PJ", size: 17.07, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.07, bold: false, italic: false, red: false },
      ], cx: [223.56, 223.57], by: [140.87, 161.12]},
      { caixa: { x: 313.7, y: 105.2, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "MRES.PB", size: 16.05, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.07, bold: false, italic: false, red: false },
      ], cx: [370.86, 370.89], by: [140.59, 161.08]},
      { caixa: { x: 468.3, y: 105.2, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "MRES.BO", size: 16.05, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [525.4, 525.43], by: [139.84, 161.32]},
      { caixa: { x: 622.8, y: 105.2, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "MRES.MR", size: 15.41, bold: false, italic: false, red: false },
        { t: "padtec", size: 16.05, bold: false, italic: false, red: false },
      ], cx: [679.95, 679.96], by: [140.73, 160.09]},
      { caixa: { x: 777.4, y: 105.2, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "SST.TQ", size: 18.1, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [834.49, 834.51], by: [140.69, 162.44]},
      { caixa: { x: 931.9, y: 105.2, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "SST.GU", size: 18.1, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [989.04, 989.06], by: [140.69, 162.44]},
      { caixa: { x: 19.1, y: 105.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "MRES.BU", size: 15.59, bold: false, italic: false, red: false },
        { t: "padtec", size: 15.59, bold: false, italic: false, red: false },
      ], cx: [76.22, 76.23], by: [141.92, 160.67]},
      { caixa: { x: 1086.5, y: 105.8, w: 114.2, h: 79.8 }, verde: false, linhas: [
        { t: "SST.BA", size: 18.1, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1143.57, 1143.6], by: [141.33, 163.08]},
      { caixa: { x: 1241, y: 105.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "SST.AC", size: 18.1, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1298.12, 1298.14], by: [141.33, 163.08]},
      { caixa: { x: 1395.5, y: 105.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "JRAG.JR", size: 18.1, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1452.67, 1452.68], by: [141.33, 163.08]},
      { caixa: { x: 1550.1, y: 105.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "CGT.AA", size: 18.1, bold: false, italic: false, red: false },
        { t: "0003", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1607.2, 1607.23], by: [141.33, 163.08]},
      { caixa: { x: 19.1, y: 213.3, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "MRES.BC", size: 16.05, bold: false, italic: false, red: false },
        { t: "padtec", size: 16.05, bold: false, italic: false, red: false },
      ], cx: [76.22, 76.24], by: [249.11, 268.61]},
      { caixa: { x: 1550.1, y: 216.1, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "CGT.AA", size: 18.1, bold: false, italic: false, red: false },
        { t: "1000", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1607.2, 1607.23], by: [251.64, 273.39]},
      { caixa: { x: 1404.1, y: 311.1, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.1, bold: false, italic: false, red: false },
        { t: "1000", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1461.24, 1461.26], by: [346.62, 368.37]},
      { caixa: { x: 19.1, y: 320.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "MRES.BC", size: 15.59, bold: false, italic: false, red: false },
        { t: "1001", size: 15.59, bold: false, italic: false, red: false },
      ], cx: [76.22, 76.24], by: [356.92, 375.67]},
      { caixa: { x: 1301.1, y: 440.5, w: 114.2, h: 79.8 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.1, bold: false, italic: false, red: false },
        { t: "1002", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1358.2, 1358.21], by: [476.03, 497.78]},
      { caixa: { x: 19.1, y: 598.2, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "MRES.BC", size: 14.56, bold: true, italic: false, red: false },
        { t: "1001", size: 14.56, bold: true, italic: false, red: false },
      ], cx: [76.23, 76.25], by: [634.76, 652.01]},
      { caixa: { x: 1301.1, y: 650.4, w: 114.2, h: 79.7 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.1, bold: false, italic: false, red: false },
        { t: "1002", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1358.2, 1358.21], by: [685.9, 707.65]},
      { caixa: { x: 19.1, y: 696.3, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "MRES.BC", size: 16.05, bold: true, italic: false, red: false },
        { t: "padtec", size: 16.05, bold: true, italic: false, red: false },
      ], cx: [76.23, 76.22], by: [732.04, 751.54]},
      { caixa: { x: 19.5, y: 816.8, w: 114.2, h: 79.8 }, verde: false, linhas: [
        { t: "MRES.BC", size: 16.05, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [76.57, 76.6], by: [851.48, 872.95]},
      { caixa: { x: 211.5, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "BERT.PB", size: 18.1, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [268.62, 268.62], by: [852.33, 874.08]},
      { caixa: { x: 403.5, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "BERT.PG", size: 16.05, bold: false, italic: false, red: false },
        { t: "padtec", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [460.62, 460.65], by: [851.48, 872.95]},
      { caixa: { x: 595.5, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "huawei", size: 18.1, bold: false, italic: false, red: false },
        { t: "BERT.BT", size: 18.1, bold: false, italic: false, red: false },
        { t: "padtecAlien", size: 14.1, bold: false, italic: false, red: false },
      ], cx: [652.67, 652.65, 652.66], by: [843.7, 865.45, 883.36]},
      { caixa: { x: 806.1, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "MCZ.JP", size: 18.1, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [863.24, 863.25], by: [852.33, 874.08]},
      { caixa: { x: 1016.7, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "SPO.BC", size: 18.1, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1073.78, 1073.82], by: [852.33, 874.08]},
      { caixa: { x: 1227.2, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "SPO.PE", size: 18.1, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1284.34, 1284.38], by: [852.33, 874.08]},
      { caixa: { x: 1408.7, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "AUJ.AJ", size: 18.1, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1465.83, 1465.85], by: [852.33, 874.08]},
      { caixa: { x: 1590.2, y: 816.8, w: 114.3, h: 79.8 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.1, bold: false, italic: false, red: false },
        { t: "1000", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1647.31, 1647.31], by: [852.33, 874.08]},
      { caixa: { x: 19.1, y: 428.3, w: 261.6, h: 142.1 }, verde: true, linhas: [
        { t: "I-BR-SP-SST-S2B-", size: 23.42, bold: true, italic: false, red: false },
        { t: "HL4-01", size: 23.42, bold: true, italic: false, red: false },
      ], cx: [149.83, 149.88], by: [494.11, 521.86]},
      { caixa: { x: 1486.8, y: 436.2, w: 240.8, h: 97.2 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HU", size: 23.42, bold: true, italic: false, red: false },
        { t: "M-HL3-01", size: 23.42, bold: true, italic: false, red: false },
      ], cx: [1607.18, 1607.22], by: [479.49, 507.24]},
      { caixa: { x: 1486.8, y: 553.2, w: 240.8, h: 97.2 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HU", size: 23.42, bold: true, italic: false, red: false },
        { t: "M-HL3-02", size: 23.42, bold: true, italic: false, red: false },
      ], cx: [1607.18, 1607.22], by: [596.53, 624.28]},
    ],
    paineis: [
      { outer: { x: 155.59, y: 224.14, w: 706.22, h: 164.99 }, inner: { x: 243.87, y: 224.14, w: 529.66, h: 164.99 }, linhas: [
        { t: "MRES.BC - SJC.RH GBE100 - 0001", size: 14.38, bold: true, italic: true, red: true, x0: 250.62, baseY: 242.82 },
        { t: "I-BR-SP-SJC-HUM-HL3-01 - 1/1/c31/1----I-BR-SP-SST-S2B-HL4-01", size: 14.38, bold: true, italic: true, red: false, x0: 250.62, baseY: 260.07 },
        { t: "100GE0/7/0", size: 14.38, bold: true, italic: true, red: false, x0: 250.62, baseY: 277.32 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 294.57 },
        { t: "MRES.BC :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/2630/ [003-003] /01", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 311.82 },
        { t: "- V5T404 HUA(V5T404) //0001 - p.1 T - ATIVO", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 329.07 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 346.32 },
        { t: "/00 - T404 HUA(T404) //0001 - p.1 T - ATIVO", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 363.57 },
      ]},
      { outer: { x: 155.59, y: 604.4, w: 706.22, h: 165 }, inner: { x: 243.87, y: 604.4, w: 529.66, h: 165 }, linhas: [
        { t: "MRES.BC - SJC.RH GBE100 - 0002", size: 14.38, bold: true, italic: true, red: true, x0: 250.62, baseY: 623.08 },
        { t: "I-BR-SP-SJC-HUM-HL3-02 - 1/1/c31/1 <----> I-BR-SP-SST-S2B-HL4-01", size: 14.38, bold: true, italic: true, red: false, x0: 250.62, baseY: 640.33 },
        { t: "100GE0/8/0", size: 14.38, bold: true, italic: true, red: false, x0: 250.62, baseY: 657.58 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 674.83 },
        { t: "MRES.BC :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/2630/ [003-003] /01", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 692.08 },
        { t: "- V5T404 HUA(V5T404) //0012 - p.1 T - ATIVO", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 709.33 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 726.58 },
        { t: "/00 - T404 HUA(T404) //0017 - p.1 T - ATIVO", size: 14.38, bold: true, italic: false, red: false, x0: 250.62, baseY: 743.83 },
      ]},
    ],
    linhas: [
      [76.2, 400.6, 75.6, 429.8, 1.33],
      [76.2, 320.8, 76.2, 185.6, 1.33],
      [133.4, 145.7, 186.1, 145.7, 1.33],
      [280.7, 145.1, 313.7, 145.1, 1.33],
      [426.4, 144.4, 468.3, 145.1, 1.33],
      [582.6, 145.1, 622.8, 145.1, 1.33],
      [734.8, 146.3, 777.4, 145.1, 1.33],
      [892.5, 146.2, 931.9, 145.1, 1.33],
      [1046.2, 145.1, 1086.5, 145.7, 1.33],
      [1201.4, 144.8, 1241, 145.7, 1.64],
      [1355.3, 145.7, 1395.5, 145.7, 1.64],
      [1607.2, 105.8, 1607.2, 105.8, 0.77],
      [77, 695.9, 76.2, 677.9, 0.77],
      [133.7, 856.7, 211.5, 856.7, 0.77],
      [325.8, 856.7, 403.5, 856.7, 0.77],
      [517.8, 856.7, 595.5, 856.7, 0.77],
      [709.8, 856.7, 806.1, 856.7, 0.77],
      [920.4, 856.7, 1016.7, 856.7, 0.77],
      [1131, 856.7, 1227.2, 856.7, 0.77],
      [74.9, 599, 74.2, 571.2, 0.77],
      [1628, 819.3, 1358.2, 730.1, 0.75],
      [1628, 819.3, 1362.6, 731.6, 0.77],
      [1415.3, 480.4, 1486.9, 484.8, 0.75],
      [1415.3, 480.4, 1482.2, 484.5, 0.77],
      [1341.5, 856.7, 1408.7, 856.7, 0.77],
      [1509.8, 145.7, 1550.1, 145.7, 0.77],
      [1607.2, 185.6, 1607.2, 216.1, 0.77],
      [1550.1, 256, 1518.4, 351, 0.77],
      [1404.1, 351, 1358.2, 440.5, 0.77],
      [1523, 856.7, 1590.2, 856.7, 0.75],
      [1358.2, 650.4, 1486.9, 601.8, 0.75],
      [1358.2, 650.4, 1482.6, 603.4, 0.75],
    ],
    setas: [
      { cor: '#000000', pts: [[1362.99, 730.39], [1359.28, 730.5], [1362.19, 732.81]] },
      { cor: '#000000', pts: [[1482.17, 485.74], [1485.73, 484.68], [1482.32, 483.2]] },
      { cor: '#000000', pts: [[1483.08, 604.54], [1485.83, 602.17], [1482.21, 602.22]] },
    ],
    vermelhas: [
    ],
    rotulos: [
    ],
  },
  {
    id: 'SSB',
    titulo: "I-BR-SP-SST-SSB-HL4-01",
    w: 1673, h: 1028,
    nodes: [
      { caixa: { x: 138.2, y: 85.4, w: 92.4, h: 64.4 }, verde: false, linhas: [
        { t: "SST.GU", size: 14.64, bold: false, italic: false, red: false },
        { t: "padtec", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [184.41, 184.43], by: [114.4, 131.65]},
      { caixa: { x: 257.3, y: 85.6, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SST.TQ", size: 14.64, bold: false, italic: false, red: false },
        { t: "padtec", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [303.53, 303.55], by: [114.66, 131.91]},
      { caixa: { x: 382.3, y: 85.6, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "MRES.MR", size: 12.14, bold: true, italic: false, red: false },
        { t: "padtec", size: 13.81, bold: false, italic: false, red: false },
        { t: "", size: 12.14, bold: false, italic: false, red: false },
      ], cx: [425.82, 424.62, 400.53], by: [113.77, 129.62, 129.62]},
      { caixa: { x: 507.2, y: 85.6, w: 92.5, h: 64.5 }, verde: false, linhas: [
        { t: "MRES.BO", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 12.97, bold: false, italic: false, red: false },
      ], cx: [553.42, 553.45], by: [114.57, 130.32]},
      { caixa: { x: 632.2, y: 85.6, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "MRES.PB", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 13.81, bold: false, italic: false, red: false },
      ], cx: [678.38, 678.4], by: [114.19, 130.74]},
      { caixa: { x: 757.2, y: 85.6, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "MRES.PJ", size: 13.81, bold: false, italic: false, red: false },
        { t: "padtec", size: 13.81, bold: false, italic: false, red: false },
      ], cx: [803.34, 803.36], by: [114.62, 131.12]},
      { caixa: { x: 1257, y: 85.6, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "BERT.PG", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 12.97, bold: false, italic: false, red: false },
      ], cx: [1303.16, 1303.18], by: [114.57, 130.32]},
      { caixa: { x: 19.1, y: 86.1, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SST.BA", size: 11.77, bold: true, italic: false, red: false },
        { t: "padtec", size: 11.77, bold: true, italic: false, red: false },
      ], cx: [65.3, 65.31], by: [115.43, 129.68]},
      { caixa: { x: 882.1, y: 86.1, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "MRES.BU", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 13.81, bold: false, italic: false, red: false },
      ], cx: [928.3, 928.32], by: [114.71, 131.26]},
      { caixa: { x: 1007.1, y: 86.1, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "MRES.BC", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 12.97, bold: false, italic: false, red: false },
      ], cx: [1053.25, 1053.27], by: [115.09, 130.84]},
      { caixa: { x: 1132, y: 86.1, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "BERT.PB", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 12.97, bold: false, italic: false, red: false },
      ], cx: [1178.2, 1178.22], by: [115.09, 130.84]},
      { caixa: { x: 1381.9, y: 86.1, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "BERT.BT", size: 14.64, bold: false, italic: false, red: false },
        { t: "padtec", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1428.13, 1428.15], by: [115.18, 132.43]},
      { caixa: { x: 1506.9, y: 86.1, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "BERT.BT", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
        { t: "1000", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1553.09, 1553.11, 1553.11], by: [106.56, 123.81, 141.06]},
      { caixa: { x: 19.1, y: 173.1, w: 92.4, h: 64.4 }, verde: false, linhas: [
        { t: "SST.AC", size: 12.97, bold: true, italic: false, red: false },
        { t: "padtec", size: 12.97, bold: true, italic: false, red: false },
      ], cx: [65.29, 65.3], by: [202.01, 217.76]},
      { caixa: { x: 1506.9, y: 192.6, w: 92.4, h: 64.4 }, verde: false, linhas: [
        { t: "MCZ.JP", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
        { t: "1000", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1553.1, 1553.11, 1553.11], by: [212.98, 230.23, 247.48]},
      { caixa: { x: 1379.2, y: 209, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SPO.BC", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1425.38, 1425.4], by: [229.47, 246.72]},
      { caixa: { x: 1251.5, y: 224.8, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SPO.PE", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1297.67, 1297.7], by: [245.22, 262.47]},
      { caixa: { x: 1135.9, y: 257, w: 92.5, h: 64.5 }, verde: false, linhas: [
        { t: "AUJ.AJ.", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1182.14, 1182.15], by: [277.46, 294.71]},
      { caixa: { x: 19.1, y: 260, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SST.AC", size: 11.77, bold: false, italic: false, red: false },
        { t: "1001", size: 11.77, bold: false, italic: false, red: false },
      ], cx: [65.3, 65.31], by: [289.27, 303.52]},
      { caixa: { x: 1302.1, y: 371.8, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SJC.RH", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
        { t: "1002", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1348.26, 1348.26, 1348.26], by: [392.25, 409.5, 426.75]},
      { caixa: { x: 1135, y: 372.9, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SJC.RH", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
        { t: "1000", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1181.17, 1181.17, 1181.18], by: [393.3, 410.55, 427.8]},
      { caixa: { x: 19.1, y: 484.2, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SST.AC", size: 11.77, bold: true, italic: false, red: false },
        { t: "1001", size: 11.77, bold: true, italic: false, red: false },
      ], cx: [65.3, 65.31], by: [513.51, 527.76]},
      { caixa: { x: 1267.2, y: 658, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "CGT.AA", size: 12.97, bold: false, italic: false, red: false },
        { t: "huawei", size: 12.97, bold: false, italic: false, red: false },
        { t: "1000", size: 12.97, bold: false, italic: false, red: false },
      ], cx: [1313.38, 1313.4, 1313.4], by: [679.12, 694.87, 710.62]},
      { caixa: { x: 19.1, y: 658.1, w: 92.4, h: 64.4 }, verde: false, linhas: [
        { t: "SST.AC", size: 11.77, bold: false, italic: false, red: false },
        { t: "padtec", size: 11.77, bold: false, italic: false, red: false },
      ], cx: [65.3, 65.31], by: [687.35, 701.6]},
      { caixa: { x: 1498.5, y: 658.3, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "CGT.AA", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
        { t: "1002", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1544.67, 1544.69, 1544.68], by: [678.74, 695.99, 713.24]},
      { caixa: { x: 221.9, y: 658.8, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "SAFP.FP", size: 13.81, bold: false, italic: false, red: false },
        { t: "padtec", size: 13.81, bold: false, italic: false, red: false },
      ], cx: [268.06, 268.09], by: [687.84, 704.34]},
      { caixa: { x: 480, y: 659.9, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "JRAG.JR", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [521.9, 526.23], by: [688.15, 705.49]},
      { caixa: { x: 743, y: 660.3, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "CGT.AA", size: 12.97, bold: false, italic: false, red: false },
        { t: "padtec", size: 14.64, bold: false, italic: false, red: false },
        { t: "0003", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [789.19, 789.23, 789.23], by: [679.85, 697.19, 714.44]},
      { caixa: { x: 1021.9, y: 660.3, w: 92.4, h: 64.5 }, verde: false, linhas: [
        { t: "CGT.AA", size: 14.64, bold: false, italic: false, red: false },
        { t: "huawei", size: 14.64, bold: false, italic: false, red: false },
        { t: "1002", size: 14.64, bold: false, italic: false, red: false },
      ], cx: [1068.08, 1068.09, 1068.09], by: [680.69, 697.94, 715.19]},
      { caixa: { x: 19.1, y: 346.9, w: 211.5, h: 114.9 }, verde: true, linhas: [
        { t: "I-BR-SP-SST-SSB-", size: 18.1, bold: true, italic: false, red: false },
        { t: "HL4-01", size: 18.1, bold: true, italic: false, red: false },
      ], cx: [121.28, 73.07], by: [399.96, 421.71]},
      { caixa: { x: 1460.2, y: 365, w: 194.7, h: 78.6 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HU", size: 18.93, bold: true, italic: false, red: false },
        { t: "M-HL3-02", size: 18.93, bold: true, italic: false, red: false },
      ], cx: [1557.53, 1557.54], by: [400.01, 422.51]},
      { caixa: { x: 1460.2, y: 460.1, w: 194.7, h: 78.6 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HU", size: 18.93, bold: true, italic: false, red: false },
        { t: "M-HL3-01", size: 18.93, bold: true, italic: false, red: false },
      ], cx: [1557.53, 1557.54], by: [495.05, 517.55]},
    ],
    paineis: [
      { outer: { x: 125.45, y: 191.05, w: 571.01, h: 133.41 }, inner: { x: 196.82, y: 191.05, w: 428.27, h: 133.41 }, linhas: [
        { t: "SJC_RH_-SST_AC_-GBE100-0002", size: 11.63, bold: true, italic: true, red: true, x0: 202.07, baseY: 204.8 },
        { t: "I-BR-SP-SJC-HUM-HL3-02#2/1/C17/1 <----> I-BR-SP-SST-SSB-HL4-01", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 219.05 },
        { t: "HundredGigE0/1/0/0", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 233.3 },
        { t: "------------------------------------------------------------------------------------------------------", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 247.55 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 261.8 },
        { t: "/00 - T404 HUA(T404) //0017 - p.2 T - ATIVO", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 276.05 },
        { t: "SST.AC :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/0008/ [050-054] /0 -", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 290.3 },
        { t: "V5T404 HUA(V5T404) //0002 - p.1 T - ATIVO", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 304.55 },
      ]},
      { outer: { x: 125.45, y: 484.21, w: 571.01, h: 133.41 }, inner: { x: 196.82, y: 484.21, w: 428.27, h: 133.41 }, linhas: [
        { t: "SJC.RH - SST.AC_-GBE100-0001", size: 11.63, bold: true, italic: true, red: true, x0: 202.07, baseY: 497.95 },
        { t: "I-BR-SP-SJC-HUM-HL3-01#2/1/C17/1 <----> I-BR-SP-SST-SSB-HL4-01", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 512.2 },
        { t: "HundredGigE0/0/0/0", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 526.45 },
        { t: "------------------------------------------------------------------------------------------------------", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 540.7 },
        { t: "SST.AC :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/0008/ [050-054] /0 -", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 554.95 },
        { t: "V5T404 HUA(V5T404) //0011 - p.1 T - ATIVO", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 569.2 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 583.45 },
        { t: "/00 - T404 HUA(T404) //0001 - p.2 T - ATIVO", size: 11.63, bold: true, italic: false, red: false, x0: 202.07, baseY: 597.7 },
      ]},
    ],
    linhas: [
      [65.3, 324.5, 64.8, 348.1, 1.08],
      [65.3, 260, 65.3, 150.6, 1.08],
      [111.5, 118.4, 154.1, 118.4, 1.08],
      [230.6, 117.9, 257.3, 117.9, 1.08],
      [348.4, 117.3, 382.3, 117.9, 1.08],
      [474.7, 117.9, 507.3, 117.9, 1.08],
      [597.8, 118.9, 632.2, 117.9, 1.08],
      [725.3, 118.8, 757.2, 117.9, 1.08],
      [849.6, 117.9, 882.1, 118.4, 1.08],
      [975.1, 117.7, 1007.1, 118.4, 1.33],
      [1099.5, 118.4, 1132, 118.4, 1.33],
      [1303.2, 85.6, 1303.2, 85.6, 0.62],
      [65.9, 563.2, 65.3, 548.7, 0.62],
      [65.3, 548.7, 65.3, 658, 0.62],
      [111.5, 690.3, 221.9, 691.1, 0.62],
      [314.3, 691.1, 480, 692.2, 0.62],
      [572.4, 692.2, 743, 692.5, 0.62],
      [835.4, 692.5, 1021.9, 692.5, 0.62],
      [1114.3, 692.5, 1267.2, 690.3, 0.62],
      [1359.6, 690.3, 1498.5, 690.6, 0.62],
      [64.2, 484.9, 63.6, 462.5, 0.62],
      [1222.9, 117, 1257, 117.9, 0.62],
      [1349.4, 117.9, 1381.9, 118.4, 0.62],
      [1474.3, 118.4, 1506.9, 118.4, 0.62],
      [1553.1, 150.6, 1553.1, 192.6, 0.62],
      [1506.9, 224.8, 1471.6, 241.3, 0.62],
      [1379.2, 241.3, 1343.9, 257, 0.62],
      [1182.1, 321.5, 1181.2, 372.9, 0.62],
      [1227.4, 405.1, 1302, 404.1, 0.62],
      [1394.5, 404.1, 1460.2, 404.3, 0.62],
      [1251.5, 257, 1251.5, 257, 0.62],
      [1229.2, 288.6, 1253.9, 276, 0.62],
      [1545.1, 539.2, 1544.7, 658.3, 0.62],
    ],
    setas: [
    ],
    vermelhas: [
    ],
    rotulos: [
    ],
  },
  {
    id: 'U3J',
    titulo: "I-BR-SP-SST-U3J-HL4-01",
    w: 1533, h: 1037,
    nodes: [
      { caixa: { x: 162.5, y: 102.1, w: 111.2, h: 77.7 }, verde: false, linhas: [
        { t: "SST.TQ", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [218.08, 218.1], by: [136.86, 157.86]},
      { caixa: { x: 305.9, y: 102.5, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SST.GU", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [361.48, 361.5], by: [137.18, 158.18]},
      { caixa: { x: 456.3, y: 102.5, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SST.BA", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [511.88, 511.91], by: [137.18, 158.18]},
      { caixa: { x: 606.7, y: 102.5, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "SST.AC", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [662.31, 662.33], by: [137.18, 158.18]},
      { caixa: { x: 757.1, y: 102.5, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "SAFP.FP", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [812.71, 812.74], by: [137.18, 158.18]},
      { caixa: { x: 907.5, y: 102.5, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "JRAG.JR", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [963.15, 963.16], by: [137.18, 158.18]},
      { caixa: { x: 19.1, y: 103.1, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.MR", size: 15.5, bold: false, italic: false, red: false },
        { t: "padtec", size: 15.5, bold: false, italic: false, red: false },
      ], cx: [74.72, 74.72], by: [138.03, 156.78]},
      { caixa: { x: 1058, y: 103.1, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "CGT.AA", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1113.56, 1113.58], by: [137.81, 158.81]},
      { caixa: { x: 1208.4, y: 103.1, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "CGT", size: 17.62, bold: false, italic: false, red: false },
        { t: ".", size: 17.62, bold: false, italic: false, red: false },
        { t: "AA", size: 17.62, bold: false, italic: false, red: false },
        { t: "1002", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1249.8, 1270.84, 1285.03, 1264], by: [137.81, 137.81, 137.81, 158.81]},
      { caixa: { x: 1358.8, y: 103.1, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "CGT.AA", size: 17.62, bold: false, italic: false, red: false },
        { t: "1000", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1414.39, 1414.42], by: [137.81, 158.81]},
      { caixa: { x: 1358.8, y: 203, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "1000", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1414.4, 1414.42], by: [237.72, 258.72]},
      { caixa: { x: 19.1, y: 207.7, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.BO", size: 15.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 15.62, bold: false, italic: false, red: false },
      ], cx: [74.7, 74.72], by: [242.77, 261.52]},
      { caixa: { x: 1358.8, y: 302.9, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "1002", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1414.4, 1414.42], by: [337.62, 358.62]},
      { caixa: { x: 19.1, y: 312.3, w: 111.2, h: 77.7 }, verde: false, linhas: [
        { t: "MRES.BO", size: 14.17, bold: false, italic: false, red: false },
        { t: "1001", size: 14.17, bold: false, italic: false, red: false },
      ], cx: [74.69, 74.72], by: [347.51, 364.76]},
      { caixa: { x: 887.8, y: 556.1, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "1000", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [943.44, 943.45, 943.45], by: [580.29, 601.29, 622.29]},
      { caixa: { x: 1097.1, y: 556.1, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "SJC.RH", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "1002", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1152.76, 1152.76, 1152.76], by: [580.29, 601.29, 622.29]},
      { caixa: { x: 19.1, y: 582.3, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.BO", size: 14.17, bold: true, italic: false, red: false },
        { t: "1001", size: 14.17, bold: true, italic: false, red: false },
      ], cx: [74.7, 74.72], by: [617.43, 634.68]},
      { caixa: { x: 19.1, y: 677.8, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.BO", size: 15.62, bold: true, italic: false, red: false },
        { t: "padtec", size: 15.62, bold: true, italic: false, red: false },
        { t: "0003", size: 15.62, bold: true, italic: false, red: false },
      ], cx: [74.72, 74.71, 74.72], by: [703.43, 722.18, 740.93]},
      { caixa: { x: 1045.2, y: 695.1, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "AUJ.AJ", size: 18.1, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1102.3, 1102.32], by: [730.59, 752.34]},
      { caixa: { x: 1283.6, y: 718.3, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "SPO.PE", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1339.18, 1339.22], by: [753.04, 774.04]},
      { caixa: { x: 1113.8, y: 835.2, w: 114.3, h: 79.7 }, verde: false, linhas: [
        { t: "MCZ.JP", size: 18.1, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.1, bold: false, italic: false, red: false },
      ], cx: [1170.94, 1170.96], by: [870.68, 892.43]},
      { caixa: { x: 19.1, y: 837.3, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.PB", size: 14.17, bold: false, italic: false, red: false },
        { t: "padtec", size: 14.17, bold: false, italic: false, red: false },
      ], cx: [74.69, 74.72], by: [872.47, 889.72]},
      { caixa: { x: 1342.8, y: 837.3, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "SPO.BC", size: 17.62, bold: false, italic: false, red: false },
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [1398.43, 1398.46], by: [872.02, 893.02]},
      { caixa: { x: 170.8, y: 838.2, w: 111.3, h: 77.7 }, verde: false, linhas: [
        { t: "MRES.PJ", size: 16.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [226.42, 226.44], by: [872.39, 893.6]},
      { caixa: { x: 314.2, y: 838.6, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.BU", size: 15.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [368.24, 369.83], by: [872.5, 893.17]},
      { caixa: { x: 464.6, y: 838.6, w: 111.3, h: 77.6 }, verde: false, linhas: [
        { t: "MRES.BC", size: 15.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [520.25, 520.25], by: [872.5, 893.17]},
      { caixa: { x: 615.1, y: 838.6, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "BERT.PB", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [670.66, 670.66], by: [873.3, 894.3]},
      { caixa: { x: 765.5, y: 838.6, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "BERT.PG", size: 15.62, bold: false, italic: false, red: false },
        { t: "padtec", size: 17.62, bold: false, italic: false, red: false },
      ], cx: [821.08, 821.09], by: [872.5, 893.17]},
      { caixa: { x: 915.9, y: 838.6, w: 111.2, h: 77.6 }, verde: false, linhas: [
        { t: "huawei", size: 17.62, bold: false, italic: false, red: false },
        { t: "BERT.BT", size: 17.62, bold: false, italic: false, red: false },
        { t: "padtecAlien", size: 13.62, bold: false, italic: false, red: false },
      ], cx: [971.5, 971.5, 971.49], by: [865.05, 886.05, 903.21]},
      { caixa: { x: 19.1, y: 417, w: 254.6, h: 138.3 }, verde: true, linhas: [
        { t: "I-BR-SP-SST-U3J", size: 23.79, bold: true, italic: false, red: false },
        { t: "-HL4-01", size: 23.79, bold: true, italic: false, red: false },
      ], cx: [146.34, 146.39], by: [480.46, 508.96]},
      { caixa: { x: 1270.8, y: 417.9, w: 234.3, h: 94.6 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HU", size: 22.79, bold: true, italic: false, red: false },
        { t: "M-HL3-01", size: 22.79, bold: true, italic: false, red: false },
      ], cx: [1387.91, 1387.93], by: [460.11, 487.11]},
      { caixa: { x: 1270.8, y: 544.6, w: 234.3, h: 94.6 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HU", size: 22.79, bold: true, italic: false, red: false },
        { t: "M-HL3-02", size: 22.79, bold: true, italic: false, red: false },
      ], cx: [1387.91, 1387.93], by: [586.77, 613.77]},
    ],
    paineis: [
      { outer: { x: 142.47, y: 218.23, w: 687.37, h: 160.6 }, inner: { x: 228.39, y: 218.23, w: 515.53, h: 160.6 }, linhas: [
        { t: "MRES.BO - SJC.RH GBE100 - 0001", size: 14, bold: true, italic: true, red: true, x0: 235.14, baseY: 237.72 },
        { t: "I-BR-SP-SJC-HUM-HL3-01 - 1/1/c33/1 <----> I-BR-SP-SST-U3J-HL4-01", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 254.22 },
        { t: "100GE0/7/0", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 270.72 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 287.22 },
        { t: "MRES.BO :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/112/ [004-004] /00 -", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 303.72 },
        { t: "V5T404 HUA(V5T404) //0011 - p.1 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 320.22 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 336.72 },
        { t: "/00 - T404 HUA(T404) //0001 - p.3 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 353.22 },
      ]},
      { outer: { x: 142.47, y: 582.27, w: 687.37, h: 160.59 }, inner: { x: 228.39, y: 582.27, w: 515.53, h: 160.59 }, linhas: [
        { t: "MRES.BO - SJC.RH GBE100 - 0002", size: 14, bold: true, italic: true, red: true, x0: 235.14, baseY: 601.75 },
        { t: "I-BR-SP-SJC-HUM-HL3-02 - 1/1/c33/1 <----> I-BR-SP-SST-U3J-HL4-01", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 618.25 },
        { t: "100GE0/8/0", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 634.75 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 651.25 },
        { t: "MRES.BO :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/112/ [004-004] /00 -", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 667.75 },
        { t: "V5T404 HUA(V5T404) //0001 - p.1 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 684.25 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 700.75 },
        { t: "/00 - T404 HUA(T404) //0017 - p.3 T - ATIVO", size: 14, bold: true, italic: false, red: false, x0: 235.14, baseY: 717.25 },
      ]},
    ],
    linhas: [
      [74.7, 390, 74.1, 418.4, 1.3],
      [74.7, 312.3, 74.7, 180.7, 1.3],
      [130.3, 141.9, 181.6, 141.9, 1.3],
      [273.7, 141.3, 305.9, 141.3, 1.3],
      [415.5, 140.6, 456.3, 141.3, 1.3],
      [567.5, 141.3, 606.7, 141.3, 1.3],
      [715.7, 142.5, 757.1, 141.3, 1.3],
      [869.2, 142.4, 907.5, 141.3, 1.3],
      [1018.8, 141.3, 1058, 141.9, 1.3],
      [1169.9, 141, 1208.4, 141.9, 1.6],
      [1319.6, 141.9, 1358.8, 141.9, 1.6],
      [1414.4, 203, 1414.4, 203, 0.75],
      [1414.4, 203, 1414.4, 180.7, 0.75],
      [1414.4, 180.7, 1414.4, 203, 0.75],
      [1414.4, 280.6, 1414.4, 302.9, 0.75],
      [1413.2, 381.2, 1413.5, 415.6, 0.75],
      [75.4, 677.4, 74.7, 659.9, 0.75],
      [74.7, 755.4, 74.7, 837.3, 0.75],
      [130.3, 876.1, 170.8, 877.1, 0.75],
      [282.8, 878.2, 314.2, 877.4, 0.75],
      [425.5, 877.4, 464.6, 877.4, 0.75],
      [574.7, 876.2, 615.1, 877.4, 0.75],
      [725.4, 876.6, 765.5, 877.4, 0.75],
      [876.7, 877.4, 915.9, 877.4, 0.75],
      [73.4, 583.1, 72.7, 556.1, 0.75],
      [1027.1, 877.4, 1113.8, 875, 0.75],
      [1228.1, 875, 1342.9, 876.1, 0.75],
      [1283.6, 757.1, 1159.5, 735, 0.75],
      [1283.6, 757.1, 1163.9, 735.8, 0.75],
      [1045.2, 735, 943.5, 633.7, 0.75],
      [1045.2, 735, 946.6, 636.9, 0.75],
      [999.1, 594.9, 1097.1, 594.9, 0.75],
      [999.1, 594.9, 1092.6, 594.9, 0.75],
      [1208.4, 594.9, 1270.8, 591.9, 0.75],
      [1208.4, 594.9, 1266.3, 592.1, 0.75],
      [1394.6, 839.3, 1339.2, 795.9, 0.75],
      [1394.6, 839.3, 1342.8, 798.7, 0.75],
    ],
    setas: [
      { cor: '#000000', pts: [[1164.11, 734.54], [1160.55, 735.16], [1163.68, 736.97]] },
      { cor: '#000000', pts: [[947.52, 635.99], [944.23, 634.47], [945.77, 637.75]] },
      { cor: '#000000', pts: [[1092.65, 596.12], [1096.05, 594.88], [1092.65, 593.64]] },
      { cor: '#000000', pts: [[1266.33, 593.33], [1269.67, 591.93], [1266.21, 590.86]] },
      { cor: '#000000', pts: [[1343.53, 797.73], [1340.08, 796.61], [1342, 799.68]] },
    ],
    vermelhas: [
    ],
    rotulos: [
    ],
  },
  {
    id: 'UBT',
    titulo: "I-BR-SP-UTB-UBT-HL4-01",
    w: 1613, h: 977,
    nodes: [
      { caixa: { x: 244.2, y: 105, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "UTB.LZ", size: 14.58, bold: true, italic: false, red: false },
        { t: "0001", size: 14.58, bold: true, italic: false, red: false },
        { t: "huawei", size: 14.58, bold: true, italic: false, red: false },
      ], cx: [301.36, 301.37, 301.36], by: [133.02, 150.27, 167.52]},
      { caixa: { x: 516.3, y: 105.3, w: 114.4, h: 79.9 }, verde: false, linhas: [
        { t: "UTB.LG", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [573.5, 573.53], by: [140.89, 162.64]},
      { caixa: { x: 778.3, y: 105.3, w: 114.4, h: 79.9 }, verde: false, linhas: [
        { t: "CGT.MG", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [835.51, 835.53], by: [140.89, 162.64]},
      { caixa: { x: 19.5, y: 106, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "UTB.TG", size: 16.07, bold: true, italic: false, red: false },
        { t: "0002", size: 16.07, bold: true, italic: false, red: false },
        { t: "huawei", size: 16.07, bold: true, italic: false, red: false },
      ], cx: [76.64, 76.66, 76.64], by: [132.05, 151.55, 171.05]},
      { caixa: { x: 1019, y: 106, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "CGT.AA", size: 18.12, bold: false, italic: false, red: false },
        { t: "0002", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1076.18, 1076.21, 1076.21], by: [130.65, 152.4, 174.15]},
      { caixa: { x: 1208.1, y: 106, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "CGT.AA", size: 18.12, bold: false, italic: false, red: false },
        { t: "0001", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1265.32, 1265.34, 1265.34], by: [130.65, 152.4, 174.15]},
      { caixa: { x: 1397.2, y: 106, w: 114.5, h: 79.8 }, verde: false, linhas: [
        { t: "PRB.DC", size: 18.12, bold: false, italic: false, red: false },
        { t: "0001", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1454.44, 1454.46, 1454.46], by: [130.65, 152.4, 174.15]},
      { caixa: { x: 1397.2, y: 208.7, w: 114.5, h: 79.9 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.12, bold: false, italic: false, red: false },
        { t: "0105", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1454.45, 1454.46], by: [244.3, 266.05]},
      { caixa: { x: 1397.2, y: 311.5, w: 114.5, h: 79.8 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.12, bold: false, italic: false, red: false },
        { t: "1002", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1454.45, 1454.46], by: [347.07, 368.82]},
      { caixa: { x: 19.1, y: 321.2, w: 114.4, h: 79.9 }, verde: false, linhas: [
        { t: "UTB.TG", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
        { t: "1001", size: 14.58, bold: false, italic: false, red: false },
      ], cx: [76.28, 76.32, 76.32], by: [348.17, 369.92, 388.27]},
      { caixa: { x: 19.1, y: 598.9, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "UTB.TG", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
        { t: "1001", size: 14.58, bold: false, italic: false, red: false },
      ], cx: [76.28, 76.32, 76.32], by: [625.84, 647.59, 665.93]},
      { caixa: { x: 1405.8, y: 690.4, w: 114.4, h: 79.9 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
        { t: "1002", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1463.03, 1463.04, 1463.04], by: [715.12, 736.87, 758.62]},
      { caixa: { x: 1153.6, y: 813.4, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "TTE.AM", size: 18.12, bold: false, italic: false, red: false },
        { t: "0004", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1210.76, 1210.79, 1210.78], by: [838.1, 859.85, 881.6]},
      { caixa: { x: 19.1, y: 814.2, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "UTB.TG", size: 15.61, bold: false, italic: false, red: false },
        { t: "huawei", size: 15.61, bold: false, italic: false, red: false },
        { t: "0005", size: 15.61, bold: false, italic: false, red: false },
      ], cx: [76.3, 76.32, 76.32], by: [840.94, 859.69, 878.44]},
      { caixa: { x: 322.7, y: 815.5, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "SLD.DC", size: 16.07, bold: false, italic: false, red: false },
        { t: "0001", size: 16.07, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [379.75, 372.63, 379.9], by: [840.44, 859.94, 881.41]},
      { caixa: { x: 632.2, y: 815.5, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "TTE.BR", size: 18.12, bold: false, italic: false, red: false },
        { t: "0001", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [689.34, 689.37, 689.37], by: [840.16, 861.91, 883.66]},
      { caixa: { x: 941.6, y: 815.5, w: 114.4, h: 79.8 }, verde: false, linhas: [
        { t: "TTE.AM", size: 18.12, bold: false, italic: false, red: false },
        { t: "0002", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [998.81, 998.84, 998.84], by: [840.16, 861.91, 883.66]},
      { caixa: { x: 1405.8, y: 816.1, w: 114.4, h: 79.9 }, verde: false, linhas: [
        { t: "SJC.RH", size: 18.12, bold: false, italic: false, red: false },
        { t: "huawei", size: 18.12, bold: false, italic: false, red: false },
        { t: "0010", size: 18.12, bold: false, italic: false, red: false },
      ], cx: [1463.03, 1463.04, 1463.04], by: [840.81, 862.56, 884.31]},
      { caixa: { x: 1294.4, y: 424.1, w: 261.9, h: 103.3 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HUM", size: 23.45, bold: true, italic: false, red: false },
        { t: "-HL3-01", size: 23.45, bold: true, italic: false, red: false },
      ], cx: [1425.33, 1425.34], by: [469.75, 498.25]},
      { caixa: { x: 19.1, y: 428.9, w: 261.9, h: 142.2 }, verde: true, linhas: [
        { t: "I-BR-SP-UTB-UBT-", size: 22.42, bold: true, italic: false, red: false },
        { t: "HL4-01", size: 22.42, bold: true, italic: false, red: false },
      ], cx: [150.04, 150.06], by: [494.51, 521.51]},
      { caixa: { x: 1294.4, y: 560.1, w: 261.9, h: 103.3 }, verde: true, linhas: [
        { t: "I-BR-SP-SJC-HUM", size: 23.45, bold: true, italic: false, red: false },
        { t: "-HL3-02", size: 23.45, bold: true, italic: false, red: false },
      ], cx: [1425.33, 1425.34], by: [605.79, 634.29]},
    ],
    paineis: [
      { outer: { x: 150.96, y: 239.96, w: 707.09, h: 165.2 }, inner: { x: 239.35, y: 239.96, w: 530.31, h: 165.2 }, linhas: [
        { t: "SJC.RH - UTB.TG GBE100 - 0001", size: 14.4, bold: true, italic: true, red: true, x0: 246.1, baseY: 258.76 },
        { t: "I-BR-SP-SJC-HUM-HL3-01 - 1/1/c30/1 <----> I-BR-SP-UTB-UBT-HL4-01", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 276.01 },
        { t: "100GE0/7/0", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 293.26 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 310.51 },
        { t: "UTB.TG :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/03/ [010-010] /01 -", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 327.76 },
        { t: "V5T404 HUA(V5T404) //0011 - p.1 T - ATIVO", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 345.01 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 362.26 },
        { t: "/00 - T404 HUA(T404) //0002 - p.1 T - ATIVO", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 379.51 },
      ]},
      { outer: { x: 150.96, y: 594.8, w: 707.09, h: 165.2 }, inner: { x: 239.35, y: 594.8, w: 530.31, h: 165.2 }, linhas: [
        { t: "SJC.RH - UTB.TG GBE100 - 0002", size: 14.4, bold: true, italic: true, red: true, x0: 246.1, baseY: 613.61 },
        { t: "I-BR-SP-SJC-HUM-HL3-02 - 1/1/c30/1 <----> I-BR-SP-UTB-UBT-HL4-01", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 630.86 },
        { t: "100GE0/8/0", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 648.11 },
        { t: "------------------------------------------------------------------------------------------------------", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 665.36 },
        { t: "UTB.TG :OTN OSN9800-M24(HUA) 1001 - Canais - T.TX/03/ [010-010] /01 -", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 682.61 },
        { t: "V5T404 HUA(V5T404) //0003 - p.1 T - ATIVO", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 699.86 },
        { t: "SJC.RH :OTN OSN-9800U32(HUA)1 1002 - Canais - 3A.IPTV/2A/ [003-003]", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 717.11 },
        { t: "/00 - T404 HUA(T404) //0018 - p.1 T - ATIVO", size: 14.4, bold: true, italic: false, red: false, x0: 246.1, baseY: 734.36 },
      ]},
    ],
    linhas: [
      [76.3, 401.1, 75.6, 430.3, 1.33],
      [76.3, 321.2, 76.7, 185.8, 1.33],
      [1454.5, 208.7, 1454.5, 208.7, 0.77],
      [1453.2, 392, 1454, 424.3, 0.77],
      [76.3, 678.7, 76.3, 814.2, 0.77],
      [133.5, 854.1, 322.7, 855.4, 0.77],
      [437.1, 855.4, 632.2, 855.4, 0.77],
      [746.6, 855.4, 941.6, 855.4, 0.77],
      [1056, 855.4, 1153.6, 853.3, 0.77],
      [1268, 853.3, 1405.8, 856, 0.77],
      [1462.3, 817.1, 1463, 770.3, 0.77],
      [76.2, 571.3, 76.3, 598.9, 0.77],
      [1463, 690.4, 1462.8, 663.3, 0.77],
      [133.9, 145.9, 244.1, 144.9, 0.77],
      [358.6, 144.9, 516.3, 145.2, 0.77],
      [630.7, 145.2, 778.3, 145.2, 0.77],
      [892.7, 145.2, 1019, 145.9, 0.77],
      [1133.4, 145.9, 1208.1, 145.9, 0.77],
      [1322.5, 145.9, 1397.2, 145.9, 0.77],
      [1454.5, 208.7, 1454.5, 185.8, 0.77],
      [1454.5, 288.6, 1454.5, 311.5, 0.77],
    ],
    setas: [
    ],
    vermelhas: [
    ],
    rotulos: [
    ],
  },
]
