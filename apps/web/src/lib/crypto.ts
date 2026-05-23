// 암호학적으로 안전한 난수 생성 유틸
export function generateRandomHex(byteLength: number): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
