// File: 04-core-code/services/quote-generator-service.js

import { paths } from '../config/paths.js';
/**
 * @fileoverview A new, single-responsibility service for generating the final quote HTML.
 * It pre-fetches and caches templates for better performance.
 */
export class QuoteGeneratorService {
    constructor({ calculationService }) {
        this.calculationService = calculationService;
        this.quoteTemplate = '';
        this.detailsTemplate = '';
        this.gmailTemplate = ''; // [NEW] For GTH template

        // [MODIFIED] The script now includes a robust CSS inlining mechanism.
        this.actionBarHtml = `
    <div id="action-bar">
        <button id="copy-html-btn">Copy HTML</button>
        <button id="print-btn">Print / Save PDF</button>
    </div>`;

        this.scriptHtml = `
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const copyBtn = document.getElementById('copy-html-btn');
            const printBtn = document.getElementById('print-btn');
            const actionBar = document.getElementById('action-bar');

            if (printBtn) {
                printBtn.addEventListener('click', function() {
                    window.print();
                });
            }

            // [NEW] CSS Inliner function
            const getInlinedHtml = () => {
                // 1. Create a deep clone of the document to avoid modifying the live page
                const clone = document.documentElement.cloneNode(true);

                // 2. Iterate through all stylesheets in the current document
                Array.from(document.styleSheets).forEach(sheet => {
                    try {
                        // 3. For each rule in the stylesheet, find matching elements in the CLONE
                        Array.from(sheet.cssRules).forEach(rule => {
                            const selector = rule.selectorText;
                            if (!selector) return;

                            const elements = clone.querySelectorAll(selector);
                            elements.forEach(el => {
                                // 4. Prepend the rule's styles to the element's existing inline style
                                // This ensures that more specific inline styles (if any) are not overridden.
                                const existingStyle = el.getAttribute('style') || '';
                                el.setAttribute('style', rule.style.cssText + existingStyle);
                            });
                        });
                    } catch (e) {
                        // Ignore potential cross-origin security errors when accessing stylesheets
                        console.warn('Could not process a stylesheet, possibly due to CORS policy:', e.message);
                    }
                });

                // 5. Remove elements that should not be in the copied output
                clone.querySelector('#action-bar')?.remove();
                clone.querySelector('script')?.remove();

                // 6. Return the full, inlined HTML as a string
                return '<!DOCTYPE html>' + clone.outerHTML;
            };

            if (copyBtn) {
                copyBtn.addEventListener('click', function() {
                    // Temporarily change button text to give user feedback
                    copyBtn.textContent = 'Processing...';
                    copyBtn.disabled = true;

                    // Use a timeout to allow the UI to update before the heavy work
                    setTimeout(() => {
                        try {
                            const inlinedHtml = getInlinedHtml();
                            
                            navigator.clipboard.writeText(inlinedHtml)
                                .then(() => {
                                    alert('HTML with inlined styles copied to clipboard successfully!');
                                })
                                .catch(err => {
                                    console.error('Failed to copy with navigator.clipboard:', err);
                                    alert('Failed to copy. Please check console for errors.');
                                });
                        } catch (err) {
                            console.error('Error during CSS inlining process:', err);
                            alert('An error occurred while preparing the HTML. See console for details.');
                        } finally {
                            // Restore button state
                            copyBtn.textContent = 'Copy HTML';
                            copyBtn.disabled = false;
                        }
                    }, 50); // 50ms delay
                });
            }
        });
    <\/script>`;

        // [MODIFIED] Script for GTH (Gmail Template HTML)
        this.scriptHtmlGmail = `
    <div id="action-bar-gth" style="position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 10001; padding: 10px; background: rgba(0,0,0,0.7); border-radius: 8px;">
        <button id="btn-copy-gth" style="padding: 10px 20px; font-size: 16px; font-weight: bold; color: #333; background-color: #fffacd; border: 1px solid #ccc; border-radius: 5px; cursor: pointer;">Copy2G</button>
    </div>
    <script>
        // --- [NEW] GST Toggle Logic ---
        document.addEventListener('DOMContentLoaded', function() {
            const gstRow = document.getElementById('gth-gst-row');
            const totalValueEl = document.getElementById('gth-total');
            const depositValueEl = document.getElementById('gth-deposit');
            const balanceValueEl = document.getElementById('gth-balance');
            const tableBody = document.getElementById('gth-summary-table')?.querySelector('tbody');

            if (!gstRow || !totalValueEl || !depositValueEl || !balanceValueEl || !tableBody) {
                console.warn('GTH: Could not find all elements for GST toggle.');
                return;
            }

            let isGstVisible = true;
            // [MODIFIED] Read from data-our-offer and data-total
            const ourOffer = parseFloat(tableBody.dataset.ourOffer);
            const grandTotal = parseFloat(tableBody.dataset.total);

            const formatCurrency = (value) => {
                if (isNaN(value)) return '$0.00';
                return '$' + value.toFixed(2);
            };

            const updateValues = (includeGst) => {
                if (includeGst) {
                    gstRow.style.display = '';
                    totalValueEl.textContent = formatCurrency(grandTotal);
                    depositValueEl.textContent = formatCurrency(grandTotal * 0.5);
                    balanceValueEl.textContent = formatCurrency(grandTotal * 0.5);
                } else {
                    gstRow.style.display = 'none';
                    // [MODIFIED] When GST is hidden, Total/Deposit/Balance are based on Our Offer
                    totalValueEl.textContent = formatCurrency(ourOffer);
                    depositValueEl.textContent = formatCurrency(ourOffer * 0.5);
                    balanceValueEl.textContent = formatCurrency(ourOffer * 0.5);
                }
            };

            gstRow.addEventListener('click', function() {
                isGstVisible = !isGstVisible;
                updateValues(isGstVisible);
            });
        });

        // --- Copy to Clipboard Logic ---
        document.getElementById('btn-copy-gth').addEventListener('click', function() {
            const btn = this;
            btn.textContent = 'Copying...';
            btn.disabled = true;

            try {
                // 1. Clone the entire document
                const clone = document.documentElement.cloneNode(true);

                // 2. Remove the action bar and this script from the clone
                clone.querySelector('#action-bar-gth')?.remove();
                clone.querySelector('script')?.remove();
                clone.querySelector('title')?.remove();
                
                // 3. Restore GST visibility in the clone before copying, if it was hidden
                const clonedGstRow = clone.querySelector('#gth-gst-row');
                if (clonedGstRow && clonedGstRow.style.display === 'none') {
                    clonedGstRow.style.display = '';
                    // Restore original values
                    const tableBody = clone.querySelector('#gth-summary-table tbody');
                    const grandTotal = parseFloat(tableBody.dataset.total); // Read correct data attribute
                    const formatCurrency = (value) => isNaN(value) ? '$0.00' : '$' + value.toFixed(2);

                    clone.querySelector('#gth-total').textContent = formatCurrency(grandTotal);
                    clone.querySelector('#gth-deposit').textContent = formatCurrency(grandTotal * 0.5);
                    clone.querySelector('#gth-balance').textContent = formatCurrency(grandTotal * 0.5);
                }

                // 4. Get the HTML source code of the clone
                const htmlToCopy = clone.outerHTML;

                // 5. [MODIFIED] Use navigator.writeText (copy as plain text source code)
                // This is more reliable and what Gmail (desktop & mobile) expects.
                navigator.clipboard.writeText(htmlToCopy)
                    .then(function() {
                        alert('Quote HTML Source copied to clipboard!');
                        btn.textContent = 'Copy2G';
                        btn.disabled = false;
                    }).catch(function(err) {
                        console.error('Failed to copy HTML source: ', err);
                        alert('Error: Could not copy to clipboard. See console.');
                        btn.textContent = 'Copy2G';
                        btn.disabled = false;
                    });
            } catch (err) {
                console.error('Error preparing HTML source copy: ', err);
                alert('An error occurred during copy. See console.');
                btn.textContent = 'Copy2G';
                btn.disabled = false;
            }
        });
    <\/script>`;


        this._initialize();
        console.log("QuoteGeneratorService Initialized.");
    }

    async _initialize() {
        try {
            // [MODIFIED] Load all three templates
            const [quoteHtml, detailsHtml, gmailHtml] = await Promise.all([
                fetch(paths.partials.quoteTemplate).then(res => res.text()),
                fetch(paths.partials.detailedItemList).then(res => res.text()),
                fetch(paths.partials.gmailSimple).then(res => res.text()) // [NEW]
            ]);
            this.quoteTemplate = quoteHtml;
            this.detailsTemplate = detailsHtml;
            this.gmailTemplate = gmailHtml; // [NEW]
            console.log("QuoteGeneratorService: All HTML templates pre-fetched and cached.");
        } catch (error) {
            console.error("QuoteGeneratorService: Failed to pre-fetch HTML templates:", error);
            // In a real-world scenario, you might want to publish an error event here.
        }
    }

    /**
     * [NEW] Generates the HTML for the GTH (Gmail) quote preview.
     * Uses the simple template and injects the rich-text copy script.
     */
    generateGmailQuoteHtml(quoteData, ui, f3Data) {
        if (!this.gmailTemplate) {
            console.error("QuoteGeneratorService: GTH template is not loaded yet.");
            return null;
        }

        const templateData = this.calculationService.getQuoteTemplateData(quoteData, ui, f3Data);

        // [MODIFIED] Call the GTH-specific "card" generator
        const itemsTableBody = this._generateGTHItemsTableHtml(templateData);

        const populatedData = {
            ...templateData,
            customerInfoHtml: this._formatCustomerInfo(templateData),
            itemsTableBody: itemsTableBody,
        };

        let finalHtml = this._populateTemplate(this.gmailTemplate, populatedData);

        // Inject the GTH action bar and script
        finalHtml = finalHtml.replace(
            '</body>',
            `${this.scriptHtmlGmail}</body>`
        );

        return finalHtml;
    }

    /**
     * [EXISTING] Generates the HTML for the full, printable quote preview.
     * Uses the complex templates and injects the HTML-copy/Print script.
     */
    generateQuoteHtml(quoteData, ui, f3Data) {
        if (!this.quoteTemplate || !this.detailsTemplate) {
            console.error("QuoteGeneratorService: Templates are not loaded yet.");
            return null;
        }

        // [REFACTORED] Delegate all data preparation to CalculationService.
        const templateData = this.calculationService.getQuoteTemplateData(quoteData, ui, f3Data);

        // [MODIFIED] Ensure the correct generators are called for the AQ flow
        const populatedDataWithHtml = {
            ...templateData,
            customerInfoHtml: this._formatCustomerInfo(templateData),
            // [FIX] Call the restored AQ-specific generator for the main page summary table
            itemsTableBody: this._generateAQPageOneItemsTableHtml(templateData),
            // [FIX] This call was already correct for the appendix page
            rollerBlindsTable: this._generateItemsTableHtml(templateData)
        };

        const populatedDetailsPageHtml = this._populateTemplate(this.detailsTemplate, populatedDataWithHtml);

        const styleMatch = populatedDetailsPageHtml.match(/<style>([\s\S]*)<\/style>/i);
        const detailsBodyMatch = populatedDetailsPageHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);

        if (!detailsBodyMatch) {
            throw new Error("Could not find body content in the details template.");
        }

        const detailsStyleContent = styleMatch ? styleMatch[0] : '';
        const detailsBodyContent = detailsBodyMatch[1];

        let finalHtml = this.quoteTemplate.replace('</head>', `${detailsStyleContent}</head>`);
        finalHtml = finalHtml.replace('</body>', `${detailsBodyContent}</body>`);
        finalHtml = this._populateTemplate(finalHtml, populatedDataWithHtml);

        // Inject the action bar and script into the final HTML
        finalHtml = finalHtml.replace(
            '<body>',
            `<body>${this.actionBarHtml}`
        );

        finalHtml = finalHtml.replace(
            '</body>',
            `${this.scriptHtml}</body>`
        );

        return finalHtml;
    }

    _populateTemplate(template, data) {
        // [FIX] Removed the faulty 'if (key === 'grandTotal' ...)' check.
        // This function will now correctly replace all placeholders.
        return template.replace(/\{\{\{?([\w\-]+)\}\}\}?/g, (match, key) => {
            const value = data[key];
            // If the key exists in the data object and is not null/undefined, return its value.
            if (value !== null && value !== undefined) {
                return value;
            }
            // Otherwise, return the original placeholder (e.g., "{{key}}")
            return match;
        });
    }

    _formatCustomerInfo(templateData) {
        let html = `<strong>${templateData.customerName || ''}</strong><br>`;
        if (templateData.customerAddress) html += `${templateData.customerAddress.replace(/\n/g, '<br>')}<br>`;
        if (templateData.customerPhone) html += `Phone: ${templateData.customerPhone}<br>`;
        if (templateData.customerEmail) html += `Email: ${templateData.customerEmail}`;
        return html;
    }

    /**
     * [EXISTING - UNCHANGED] Generates the APPENDIX table for the AQ (PDF/Print) flow.
     */
    _generateItemsTableHtml(templateData) {
        const { items, mulTimes } = templateData;
        const headers = ['#', 'F-NAME', 'F-COLOR', 'Location', 'HD', 'Dual', 'Motor', 'Price'];

        const rows = items
            .filter(item => item.width && item.height)
            .map((item, index) => {

                let fabricClass = '';
                if (item.fabric && item.fabric.toLowerCase().includes('light-filter')) {
                    fabricClass = 'bg-light-filter';
                } else if (item.fabricType === 'SN') {
                    fabricClass = 'bg-screen';
                } else if (['B1', 'B2', 'B3', 'B4', 'B5'].includes(item.fabricType)) {
                    fabricClass = 'bg-blockout';
                }

                const finalPrice = (item.linePrice || 0) * mulTimes;

                const cell = (dataLabel, content, cssClass = '') => {
                    const isEmpty = !content;
                    const finalClass = `${cssClass} ${isEmpty ? 'is-empty-cell' : ''}`.trim();
                    return `<td data-label="${dataLabel}" class="${finalClass}">${content}</td>`;
                };

                const cells = [
                    cell('#', index + 1, 'text-center'),
                    cell('F-NAME', item.fabric || '', fabricClass),
                    cell('F-COLOR', item.color || '', fabricClass),
                    cell('Location', item.location || ''),
                    cell('HD', item.winder === 'HD' ? '✔' : '', 'text-center'),
                    cell('Dual', item.dual === 'D' ? '✔' : '', 'text-center'),
                    cell('Motor', item.motor ? '✔' : '', 'text-center'),
                    cell('Price', `$${finalPrice.toFixed(2)}`, 'text-right')
                ].join('');

                return `<tr>${cells}</tr>`;
            })
            .join('');

        return `
            <table class="detailed-list-table">
                <colgroup>
                    <col style="width: 5%;">
                    <col style="width: 20%;">
                    <col style="width: 15%;">
                    <col style="width: 12%;">
                    <col style="width: 9%;">
                    <col style="width: 9%;">
                    <col style="width: 9%;">
                    <col style="width: 13%;">
                </colgroup>
                <thead>
                    <tr class="table-title">
                        <th colspan="${headers.length}">Roller Blinds - Detailed List</th>
                    </tr>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    /**
     * [RESTORED & RENAMED] Generates the multi-column SUMMARY table for the AQ (PDF/Print) flow.
     * This is the logic from "my old.html".
     */
    _generateAQPageOneItemsTableHtml(templateData) {
        const { summaryData, uiState, items } = templateData;
        const rows = [];
        const validItemCount = items.filter(i => i.width && i.height).length;

        rows.push(`
            <tr>
                <td data-label="NO">1</td>
                <td data-label="Description" class="description">Roller Blinds</td>
                <td data-label="QTY" class="align-right">${validItemCount}</td>
                <td data-label="Price" class="align-right">
                    <span class="original-price">$${(summaryData.firstRbPrice || 0).toFixed(2)}</span>
                </td>
                <td data-label="Discounted Price" class="align-right">
                    <span class="discounted-price">$${(summaryData.disRbPrice || 0).toFixed(2)}</span>
                </td>
            </tr>
        `);

        let itemNumber = 2;

        if (summaryData.acceSum > 0) {
            rows.push(`
                <tr>
                    <td data-label="NO">${itemNumber++}</td>
                    <td data-label="Description" class="description">Installation Accessories</td>
                    <td data-label="QTY" class="align-right">NA</td>
                    <td data-label="Price" class="align-right">$${(summaryData.acceSum || 0).toFixed(2)}</td>
                    <td data-label="Discounted Price" class="align-right">$${(summaryData.acceSum || 0).toFixed(2)}</td>
                </tr>
            `);
        }

        if (summaryData.eAcceSum > 0) {
            rows.push(`
                <tr>
                    <td data-label="NO">${itemNumber++}</td>
                    <td data-label="Description" class="description">Motorised Accessories</td>
                    <td data-label="QTY" class="align-right">NA</td>
                    <td data-label="Price" class="align-right">$${(summaryData.eAcceSum || 0).toFixed(2)}</td>
                    <td data-label="Discounted Price" class="align-right">$${(summaryData.eAcceSum || 0).toFixed(2)}</td>
                </tr>
            `);
        }

        const deliveryExcluded = uiState.f2.deliveryFeeExcluded;
        const deliveryPriceClass = deliveryExcluded ? 'class="align-right is-excluded"' : 'class="align-right"';
        const deliveryDiscountedPrice = deliveryExcluded ? 0 : (summaryData.deliveryFee || 0);
        rows.push(`
            <tr>
                <td data-label="NO">${itemNumber++}</td>
                <td data-label="Description" class="description">Delivery</td>
                <td data-label="QTY" class="align-right">${uiState.f2.deliveryQty || 1}</td>
                <td data-label="Price" ${deliveryPriceClass}>$${(summaryData.deliveryFee || 0).toFixed(2)}</td>
                <td data-label="Discounted Price" class="align-right">$${deliveryDiscountedPrice.toFixed(2)}</td>
            </tr>
        `);

        const installExcluded = uiState.f2.installFeeExcluded;
        const installPriceClass = installExcluded ? 'class="align-right is-excluded"' : 'class="align-right"';
        const installDiscountedPrice = installExcluded ? 0 : (summaryData.installFee || 0);
        rows.push(`
            <tr>
                <td data-label="NO">${itemNumber++}</td>
                <td data-label="Description" class="description">Installation</td>
                <td data-label="QTY" class="align-right">${validItemCount}</td>
                <td data-label="Price" ${installPriceClass}>$${(summaryData.installFee || 0).toFixed(2)}</td>
                <td data-label="Discounted Price" class="align-right">$${installDiscountedPrice.toFixed(2)}</td>
            </tr>
        `);

        const removalExcluded = uiState.f2.removalFeeExcluded;
        const removalPriceClass = removalExcluded ? 'class="align-right is-excluded"' : 'class="align-right"';
        const removalDiscountedPrice = removalExcluded ? 0 : (summaryData.removalFee || 0);
        rows.push(`
            <tr>
                <td data-label="NO">${itemNumber++}</td>
                <td data-label="Description" class="description">Removal</td>
                <td data-label="QTY" class="align-right">${uiState.f2.removalQty || 0}</td>
                <td data-label="Price" ${removalPriceClass}>$${(summaryData.removalFee || 0).toFixed(2)}</td>
                <td data-label="Discounted Price" class="align-right">$${removalDiscountedPrice.toFixed(2)}</td>
            </tr>
        `);

        return rows.join('');
    }

    /**
     * [NEW & RENAMED] Generates the "card-style" item list for the GTH (Gmail) flow.
     */
    _generateGTHItemsTableHtml(templateData) {
        const { summaryData, uiState, items } = templateData;
        const rows = [];
        const validItemCount = items.filter(i => i.width && i.height).length;

        // --- Card: Roller Blinds ---
        rows.push(this._createGTHItemCard(
            '#1', 'Roller Blinds',
            validItemCount,
            formatPrice(summaryData.firstRbPrice || 0, true),
            formatPrice(summaryData.disRbPrice || 0, false, true)
        ));

        let itemNumber = 2;

        // --- Card: Installation Accessories ---
        if (summaryData.acceSum > 0) {
            rows.push(this._createGTHItemCard(
                `#${itemNumber++}`, 'Installation Accessories',
                'NA',
                formatPrice(summaryData.acceSum || 0),
                formatPrice(summaryData.acceSum || 0)
            ));
        }

        // --- Card: Motorised Accessories ---
        if (summaryData.eAcceSum > 0) {
            rows.push(this._createGTHItemCard(
                `#${itemNumber++}`, 'Motorised Accessories',
                'NA',
                formatPrice(summaryData.eAcceSum || 0),
                formatPrice(summaryData.eAcceSum || 0)
            ));
        }

        // --- Card: Delivery ---
        const deliveryExcluded = uiState.f2.deliveryFeeExcluded;
        const deliveryOriginalPrice = formatPrice(summaryData.deliveryFee || 0, deliveryExcluded);
        const deliveryFinalPrice = deliveryExcluded ? 0 : (summaryData.deliveryFee || 0);
        rows.push(this._createGTHItemCard(
            `#${itemNumber++}`, 'Delivery',
            uiState.f2.deliveryQty || 1,
            deliveryOriginalPrice,
            formatPrice(deliveryFinalPrice) // Use formatPrice for GTH card
        ));

        // --- Card: Installation ---
        const installExcluded = uiState.f2.installFeeExcluded;
        const installOriginalPrice = formatPrice(summaryData.installFee || 0, installExcluded);
        const installFinalPrice = installExcluded ? 0 : (summaryData.installFee || 0);
        rows.push(this._createGTHItemCard(
            `#${itemNumber++}`, 'Installation',
            validItemCount,
            installOriginalPrice,
            formatPrice(installFinalPrice) // Use formatPrice for GTH card
        ));

        // --- Card: Removal ---
        const removalExcluded = uiState.f2.removalFeeExcluded;
        const removalOriginalPrice = formatPrice(summaryData.removalFee || 0, removalExcluded);
        const removalFinalPrice = removalExcluded ? 0 : (summaryData.removalFee || 0);
        rows.push(this._createGTHItemCard(
            `#${itemNumber++}`, 'Removal',
            uiState.f2.removalQty || 0,
            removalOriginalPrice,
            formatPrice(removalFinalPrice) // Use formatPrice for GTH card
        ));

        return rows.join('');
    }


    /**
     * [NEW] Helper function to generate the GTH card-style HTML for an item row.
     * This replicates the structure from the provided GTS.html.
     */
    _createGTHItemCard(itemNum, description, qty, price, discountedPrice) {

        // Helper to create one row (e.g., QTY row, Price row)
        const createRow = (label, value) => `
            <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="50%" valign="top" style="text-align: left; font-weight: 600;">${label}</td>
                            <td width="50%" valign="top" style="text-align: right;">${value}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;

        // Helper for the last row (no border-bottom)
        const createLastRow = (label, value) => `
            <tr>
                <td style="padding: 10px 15px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="50%" valign="top" style="text-align: left; font-weight: 600;">${label}</td>
                            <td width="50%" valign="top" style="text-align: right;">${value}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;

        return `
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <tbody>
                    <tr>
                        <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; background-color: #1a237e; color: white; border-radius: 4px 4px 0 0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="color: white;">
                                <tr>
                                    <td width="50%" valign="top" style="text-align: left; font-weight: bold;">${itemNum}</td>
                                    <td width="50%" valign="top" style="text-align: right; font-weight: normal;">${description}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ${createRow('QTY', qty)}
                    ${createRow('Price', price)}
                    ${createLastRow('Discounted Price', discountedPrice)}
                </tbody>
            </table>
        `;
    }
}

/**
 * [NEW] Helper function to format prices for the GTH item cards.
 */
function formatPrice(value, isStrikethrough = false, isDiscounted = false) {
    if (typeof value !== 'number') {
        value = 0;
    }

    const formattedValue = `$${value.toFixed(2)}`;

    if (isStrikethrough) {
        return `<span style="text-decoration: line-through; color: #999999; font-size: 13.3px;">${formattedValue}</span>`;
    }
    if (isDiscounted) {
        return `<span style="font-weight: bold; color: #d32f2f;">${formattedValue}</span>`;
    }
    return formattedValue;
}